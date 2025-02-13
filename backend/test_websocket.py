import asyncio
import websockets
import json

async def test_canvas():
    # Connect to the WebSocket server
    uri = "ws://localhost:8000/ws/test-project/test-file/test-user"
    async with websockets.connect(uri) as websocket:
        print("Connected to WebSocket server")

        # Test canvas drawing
        draw_data = {
            "file_type": "canvas",
            "update_type": "draw",
            "data": {
                "x": 100,
                "y": 100,
                "color": "#000000",
                "width": 2
            }
        }
        
        print("Sending draw data...")
        await websocket.send(json.dumps(draw_data))
        
        # Wait for response
        response = await websocket.recv()
        print(f"Received response: {response}")

        # Test cursor movement
        cursor_data = {
            "file_type": "canvas",
            "update_type": "cursor_move",
            "data": {
                "x": 150,
                "y": 150
            }
        }
        
        print("Sending cursor movement data...")
        await websocket.send(json.dumps(cursor_data))
        
        # Wait for response
        response = await websocket.recv()
        print(f"Received response: {response}")

async def main():
    print("Starting WebSocket test...")
    await test_canvas()
    print("Test completed!")

if __name__ == "__main__":
    asyncio.run(main()) 