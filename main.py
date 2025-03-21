#!/usr/bin/env python3
"""
Persistence service for ArtFlow drawing app.
This service reads events from Redis queue and stores them in the database.
"""

import json
import logging
import time
import os
import sys
import redis
from dotenv import load_dotenv
from database import (
    add_drawing_history,
    clear_file_history
)
import asyncio

# Setup logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.StreamHandler(sys.stdout),
        logging.FileHandler(os.path.join('logs', 'persistence.log'), 'w')
    ]
)
logger = logging.getLogger("PersistenceService")

# Load environment variables
load_dotenv()

# Buffer for collecting drawing events before persisting to database
# Structure: {project_id: {file_id: [events]}}
db_event_buffer = {}
last_db_flush_time = time.time()
DB_FLUSH_INTERVAL = 5  # Flush buffer to database every 5 seconds

def setup_redis():
    """Initialize Redis client with configuration from environment variables."""
    try:
        REDIS_HOST = os.getenv("REDIS_HOST", "localhost")
        REDIS_PORT = int(os.getenv("REDIS_PORT", "6379"))
        REDIS_PASSWORD = os.getenv("REDIS_PASSWORD", "")
        
        logger.info(f"Connecting to Redis at {REDIS_HOST}:{REDIS_PORT}")
        
        # Create Redis connection
        redis_client = redis.Redis(
            host=REDIS_HOST,
            port=REDIS_PORT,
            password=REDIS_PASSWORD,
            ssl=True if "upstash.io" in REDIS_HOST else False,  # Use SSL for Upstash
            decode_responses=True  # Auto-decode to strings
        )
        
        # Test connection
        redis_client.ping()
        logger.info(f"Successfully connected to Redis at {REDIS_HOST}:{REDIS_PORT}")
        return redis_client
    except Exception as e:
        logger.error(f"Failed to connect to Redis: {str(e)}")
        return None

# Helper function to add an event to the buffer
def add_to_db_buffer(event):
    """Add event to buffer for batched database writes"""
    project_id = event["project_id"]
    file_id = event["file_id"]
    
    # Initialize buffer structure if needed
    if project_id not in db_event_buffer:
        db_event_buffer[project_id] = {}
    if file_id not in db_event_buffer[project_id]:
        db_event_buffer[project_id][file_id] = []
    
    # Add to buffer
    db_event_buffer[project_id][file_id].append(event)
    logger.debug(f"Added {event['event_type']} event to DB buffer for {project_id}/{file_id}")

# Helper function to flush the buffer to database
async def flush_db_buffer():
    """Persist all buffered events to database and clear the buffer"""
    global last_db_flush_time
    
    try:
        total_events = 0
        batch_count = 0
        
        # Process buffer project by project, file by file
        for project_id, files in db_event_buffer.items():
            for file_id, events in files.items():
                if not events:
                    continue
                
                batch_count += 1
                events_count = len(events)
                total_events += events_count
                
                # Process drawing events for this file
                for event in events:
                    if event['event_type'] == 'draw':
                        await add_drawing_history(
                            event['project_id'],
                            event['file_id'],
                            event['user_id'],
                            event['data'],
                            event['timestamp']
                        )
                
                logger.info(f"Persisted batch of {events_count} events for {project_id}/{file_id}")
        
        # Clear buffer after successful flush
        db_event_buffer.clear()
            
        if batch_count > 0:
            logger.info(f"Database buffer flush complete: {total_events} events in {batch_count} batches")
            
        last_db_flush_time = time.time()
            
    except Exception as e:
        logger.error(f"Error flushing DB buffer: {str(e)}")
        import traceback
        logger.error(f"Traceback: {traceback.format_exc()}")
        # Don't clear buffer on error to retry on next flush

# Helper function that checks if it's time to flush and triggers flush if needed
async def check_and_flush_db_buffer():
    """Check if it's time to flush the buffer and do so if needed"""
    current_time = time.time()
    if (current_time - last_db_flush_time) >= DB_FLUSH_INTERVAL:
        await flush_db_buffer()

async def process_event(event):
    """Process a single drawing event from the queue."""
    try:
        # Check if this is a batch event
        if event.get('event_type') == 'batch':
            logger.info(f"Processing batch with {event.get('count', 0)} events for {event['project_id']}/{event['file_id']}")
            # Process each event in the batch
            for sub_event in event.get('events', []):
                await buffer_or_process_event(sub_event)
            logger.info(f"Completed processing batch for {event['project_id']}/{event['file_id']}")
        else:
            # Process as a single event
            await buffer_or_process_event(event)
            
        # Check if it's time to flush the buffer
        await check_and_flush_db_buffer()
            
    except Exception as e:
        logger.error(f"Error processing event: {str(e)}")
        import traceback
        logger.error(f"Traceback: {traceback.format_exc()}")
        # In a production system, we might want a dead-letter queue here

async def buffer_or_process_event(event):
    """Either buffer the event for later processing or process immediately based on type"""
    try:
        # Special handling for clear events - process immediately
        if event['event_type'] == 'clear':
            # First flush any pending events for this project/file
            await flush_db_buffer()
            
            # Then clear the history
            logger.info(f"Processing clear event immediately for {event['project_id']}/{event['file_id']}")
            result = await clear_file_history(event['project_id'], event['file_id'])
            logger.info(f"Result of clear_file_history: {result}")
            return
            
        # For drawing events, add to buffer for batch processing
        if event['event_type'] == 'draw':
            add_to_db_buffer(event)
            return
            
        # For unknown event types, log a warning
        logger.warning(f"Unknown event type: {event['event_type']}")
            
    except Exception as e:
        logger.error(f"Error buffering/processing event: {str(e)}")
        import traceback
        logger.error(f"Traceback: {traceback.format_exc()}")

async def start_consumer():
    """Main consumer loop that processes events from the Redis queue."""
    logger.info("Starting Redis consumer for drawing events")
    
    # Initialize Redis client
    redis_client = setup_redis()
    if not redis_client:
        logger.error("Failed to initialize Redis client. Exiting.")
        return
    
    # Check queue length at startup
    queue_length = redis_client.llen('drawing_events_queue')
    logger.info(f"Current queue length at startup: {queue_length}")
    
    # Initialize last flush time
    last_buffer_check = time.time()
    
    # Process queue items continuously
    while True:
        try:
            # Use blocking pop with timeout (BRPOP)
            # This efficiently waits for new items
            logger.debug("Waiting for new events from Redis queue...")
            result = redis_client.brpop('drawing_events_queue', timeout=1)  # Shorter timeout for more frequent buffer checks
            
            if result:
                # result is a tuple (queue_name, item)
                queue_name, event_json = result
                logger.info(f"Received event from queue '{queue_name}'")
                try:
                    event = json.loads(event_json)
                    logger.info(f"Successfully parsed JSON event of type: {event.get('event_type', 'unknown')}")
                    await process_event(event)
                except json.JSONDecodeError as je:
                    logger.error(f"Error decoding JSON: {str(je)}")
                    logger.error(f"Raw JSON data: {event_json[:100]}...")
            else:
                # If timeout occurred
                # Check if we need to flush the buffer even if no new events
                current_time = time.time()
                if (current_time - last_buffer_check) >= 1.0:  # Check every second
                    await check_and_flush_db_buffer()
                    last_buffer_check = current_time
                
                queue_length = redis_client.llen('drawing_events_queue')
                if queue_length > 0:
                    logger.warning(f"Queue has {queue_length} items but brpop timed out!")
                
        except json.JSONDecodeError as e:
            logger.error(f"Error decoding JSON: {str(e)}")
        except redis.RedisError as e:
            logger.error(f"Redis error: {str(e)}")
            time.sleep(5)  # Wait before reconnecting
            redis_client = setup_redis()  # Try to reconnect
        except Exception as e:
            logger.error(f"Error in consumer loop: {str(e)}")
            import traceback
            logger.error(f"Traceback: {traceback.format_exc()}")
            # Brief pause to prevent tight loop in case of persistent errors
            time.sleep(1)
            
        # Ensure we check the buffer occasionally regardless of messages
        try:
            current_time = time.time()
            if (current_time - last_buffer_check) >= 1.0:
                await check_and_flush_db_buffer()
                last_buffer_check = current_time
        except Exception as e:
            logger.error(f"Error checking buffer: {str(e)}")

if __name__ == "__main__":
    # Ensure logs directory exists
    if not os.path.exists('logs'):
        os.makedirs('logs')
        
    # Start the service with asyncio
    asyncio.run(start_consumer()) 