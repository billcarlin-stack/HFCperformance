import urllib.request
import re
import json

req = urllib.request.Request('https://www.hawthornfc.com.au/teams/afl', headers={'User-Agent': 'Mozilla/5.0'})
html = urllib.request.urlopen(req).read().decode('utf-8')

next_match = re.search(r'<script id="__NEXT_DATA__" type="application/json">(.*?)</script>', html, re.DOTALL)
if next_match:
    data = json.loads(next_match.group(1))
    
    # Next.js pages usually store data in props.pageProps
    players = []
    try:
        # We need to find where the players array is located. 
        # Often it's in props -> pageProps -> data -> players OR something similar
        
        # Let's dump a structured preview of the keys
        def explore_keys(d, path=""):
            if isinstance(d, dict):
                for k, v in d.items():
                    if isinstance(v, list) and len(v) > 20:
                        print(f"Found large list at {path}.{k} ({len(v)} items)")
                    explore_keys(v, f"{path}.{k}")
            elif isinstance(d, list):
                if len(d) > 0 and isinstance(d[0], dict):
                    pass # We only care about large lists of dicts
                    
        explore_keys(data)
        
        with open('next_data.json', 'w') as f:
            json.dump(data, f)
            print("Saved full JSON to next_data.json for manual inspection if needed.")
            
    except Exception as e:
        print("Error parsing", e)

