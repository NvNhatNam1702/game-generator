import os
from google.generativeai import GenerativeModel
import google.generativeai as genai

genai.configure(api_key=os.getenv("GEMINI_API_KEY"))

def make_game_code(config, save_folder="gemnigenerated"):
    # Use the input config directly as part of the prompt
    prompt = f"""
    You are a game developer specialized in 3D games using JavaScript and React. 
    Generate the code for a 3D web game based on the following configuration:

    {config}

    Ensure the code includes:
    - Necessary imports (`react`, `@react-three/fiber`, `@react-three/drei`, etc.)
    - Scene setup (camera, lighting, renderer)
    - Game initialization and structure
    - Core components (e.g., player, environment, objects)
    - Game loop and animation logic using `useFrame`
    - Handling user input (e.g., mouse, keyboard)
    - Game state updates and interactions (e.g., collisions, scoring)
    - A way to start and stop the game (e.g., menu or button)

    The code should be clean, component-based, and include meaningful comments.
    Provide only the code as the response, without any additional text.
    """
    model = GenerativeModel(model_name="gemini-2.0-flash-thinking-exp")
    try:
        # Generate content using the prompt
        response = model.generate_content([prompt])
        
        # Save the generated code to a file
        os.makedirs(save_folder, exist_ok=True)
        file_path = os.path.join(save_folder, "generated_game.js")
        with open(file_path, "w") as file:
            file.write(response.text)
        
        print(f"Game code generated and saved to {file_path}")
        return file_path
    except Exception as e:
        print(f"An error occurred: {e}")
        return None