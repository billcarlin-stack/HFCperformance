import json

try:
    with open('next_data.json', 'r') as f:
        data = json.load(f)
        
    def find_players(obj, path=""):
        if isinstance(obj, dict):
            for k, v in obj.items():
                if isinstance(v, list) and len(v) > 20:
                    if len(v) > 0 and isinstance(v[0], dict) and 'playerName' in v[0]:
                        print(f"BINGO! Found players at {path}.{k}")
                        return v
                    elif len(v) > 0 and isinstance(v[0], dict) and 'player' in v[0]:
                        print(f"BINGO! Found nested players at {path}.{k}")
                        return v
                res = find_players(v, f"{path}.{k}")
                if res: return res
        elif isinstance(obj, list):
            for i, item in enumerate(obj):
                res = find_players(item, f"{path}[{i}]")
                if res: return res
        return None
        
    players = find_players(data)
    if not players:
        print("Couldn't find players by exact key, let's just print keys of large lists.")
        def find_large_lists(obj, path=""):
            if isinstance(obj, dict):
                for k, v in obj.items():
                    if isinstance(v, list) and len(v) > 20:
                        if len(v) > 0 and isinstance(v[0], dict):
                            print(f"List at {path}.{k} has keys: {list(v[0].keys())}")
                    find_large_lists(v, f"{path}.{k}")
            elif isinstance(obj, list):
                for i, item in enumerate(obj):
                    find_large_lists(item, f"{path}[{i}]")
        find_large_lists(data)
        
except Exception as e:
    print(e)
