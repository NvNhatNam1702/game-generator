GAME_GENRE = ["shooting", "puzzle", "racing"]
STYLE = ["modern", "retro", "fantasy"]

# Map game styles to their respective features
GAME_FEATURES_MAP = {
    "shooting": ["levels up system", "health", "random bullet"],
    "racing": ["levels up system", "health", "puzzle solving"],
}
def game_features_map(GAME_STYLE): 
    return GAME_FEATURES_MAP.get(GAME_STYLE, [])