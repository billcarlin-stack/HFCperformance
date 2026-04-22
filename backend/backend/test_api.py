import urllib.request
import json
import ssl

ctx = ssl.create_default_context()
ctx.check_hostname = False
ctx.verify_mode = ssl.CERT_NONE

# The AFL club sites typically pull from a common API. Let's try the roster API Endpoint.
# The URL structure usually looks like this for the AFL network:
url = 'https://aflapi.afl.com.au/afl/v2/squads?CompetitionId=1&SeasonId=63'
req = urllib.request.Request(url, headers={
    'User-Agent': 'Mozilla/5.0',
    'x-media-mis-token': 'token' # Often bypassed
})

try:
    response = urllib.request.urlopen(req, context=ctx).read().decode('utf-8')
    data = json.loads(response)
    print("Keys:", data.keys())
    if 'squads' in data:
        hawks = [s for s in data['squads'] if s.get('team', {}).get('name') == 'Hawthorn']
        if hawks:
            print(f"Found Hawthorn! {len(hawks[0].get('players', []))} players.")
except Exception as e:
    print("API Error:", e)

