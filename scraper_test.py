import urllib.request
import pandas as pd
import ssl

ctx = ssl.create_default_context()
ctx.check_hostname = False
ctx.verify_mode = ssl.CERT_NONE

req = urllib.request.Request('https://www.footywire.com/afl/footy/ts-hawthorn-hawks', headers={'User-Agent': 'Mozilla/5.0'})
html = urllib.request.urlopen(req, context=ctx).read()
dfs = pd.read_html(html)

with open('scraper_output.txt', 'w', encoding='utf-8') as f:
    for i, df in enumerate(dfs):
        if len(df) > 10:
            f.write(f"\nTable {i} size: {df.shape}\n")
            f.write(str(df.columns.tolist()) + "\n")
            f.write(str(df.head(2).to_dict('records')) + "\n")

req2 = urllib.request.Request('https://www.footywire.com/afl/footy/tp-hawthorn-hawks', headers={'User-Agent': 'Mozilla/5.0'})
html2 = urllib.request.urlopen(req2, context=ctx).read()
dfs2 = pd.read_html(html2)

with open('scraper_output_roster.txt', 'w', encoding='utf-8') as f:
    for i, df in enumerate(dfs2):
        if len(df) > 10:
            f.write(f"\nRoster Table {i} size: {df.shape}\n")
            f.write(str(df.columns.tolist()) + "\n")
            f.write(str(df.head(2).to_dict('records')) + "\n")

print("Done")
