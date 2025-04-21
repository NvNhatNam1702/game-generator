from config import GAME_GENRE, STYLE, GAME_FEATURES_MAP, game_features_map
from gemini_help import make_game_code
from langchain_utils import get_rag_chain
from chroma_utils import index_document_to_chroma, vectorstore
import os

def get_rag_response(query, rag_chain):
    try:
        response = rag_chain.invoke({
            "input": query,
            "chat_history": []
        })
        print("🔍 Raw RAG response:", response)
        if isinstance(response, dict):
            output = response.get("output") or response.get("result") or response.get("text")
            if output:
                return output.strip()
            else:
                raise ValueError("No expected output key found in the response.")
        else:
            raise ValueError("RAG chain response is not a dictionary.")
    except Exception as e:
        print(f"Error in get_rag_response: {e}")
        return None

def parse_and_index_pdfs_in_folder(folder_path):
    """Parse and index all PDF files in the specified folder."""
    for file_name in os.listdir(folder_path):
        if file_name.endswith(".pdf"):
            file_path = os.path.join(folder_path, file_name)
            print(f"Parsing and indexing PDF: {file_path}")
            success = index_document_to_chroma(file_path, file_id=file_name)
            if success:
                print(f"Successfully indexed {file_path} into Chroma.")
            else:
                print(f"Failed to index {file_path}.")


def select_option(prompt, options, multi=False):
    """Prompt the user to select an option from a list."""
    print(prompt)
    for i, option in enumerate(options, start=1):
        print(f"{i}. {option}")
    if multi == True :
        while True : 
            try:
               multi_choice = input("enter the number that being seperated by the comma")
               choice_num=[int(num.strip()) for num in multi_choice.split(",")]
               if all(1 <= choice <= len(option) for choice in choice_num) : 
                   return [options[choice - 1] for choice in choice_num]
               else :
                   print("Invalid choice(s). Please select valid numbers.")

            except :
                print("Invalid input. Please enter numbers separated by commas.")    
 
    else : 
        while True:
            try:
                choice = int(input("Enter the number of your choice: ").strip())
                if 1 <= choice <= len(options):
                    return options[choice - 1]
                else:
                    print("Invalid choice. Please select a valid number.")
            except ValueError:
                print("Invalid input. Please enter a number.")


def main():
    print("🎮 AI Game Generator - Terminal Edition")
    
    # Prompt the user to select game genre
    game_genre = select_option("Select a game genre:", GAME_GENRE)

    # Prompt the user to select style
    style = select_option("Select a style:", STYLE)

    # Prompt the user to select features based on the selected genre
    features = select_option(f"Select a feature for the {game_genre} genre:", GAME_FEATURES_MAP[game_genre], multi=True)


    # (Optional) Index your documents if needed
    pdf_folder_path = "data/"
    parse_and_index_pdfs_in_folder(pdf_folder_path)

    # Initialize RAG chain
    rag_chain = get_rag_chain(model="gemini-2.0-flash")
   
    essential_class_syntax = get_rag_response(
            f"Provide the syntax for an essential class used in game development with {features}, {style}, {game_genre} .",
            rag_chain
        )

    if not essential_class_syntax:
        print("No class syntax provided. Exiting...")
    else :
        print("\nRetrieved Class Syntax:")
        print(essential_class_syntax)


    # Build the final configuration merging essential class syntax with other options.
    config = {
        "essential_class": essential_class_syntax,
        "game_genre": game_genre,
        "style": style,
        "selected_feature": features,
        "game_features_map": GAME_FEATURES_MAP,
        "get_features": game_features_map  # This can be used later to retrieve features based on a given style.
    }

    print("\nGenerating game code...")
    try:
        file_path = make_game_code(config)
        print(f"\n✅ Game code saved to: {file_path}")
    except Exception as e:
        print(f"\n❌ Error: {e}")

if __name__ == "__main__":
    main()