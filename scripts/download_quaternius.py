import urllib.request
import re
import json
import os
import sys

def check_drive():
    url = "https://drive.google.com/drive/folders/1mWP6sCHun7OUMHQeDNZLrXTteXlzWg_t?usp=sharing"
    req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'})
    try:
        with urllib.request.urlopen(req) as resp:
            html = resp.read().decode('utf-8')
            print("Drive page length:", len(html))
            
            # Find data payload
            with open("scripts/drive_page.html", "w", encoding="utf-8") as f:
                f.write(html)
            print("Saved drive_page.html")
    except Exception as e:
        print("Error fetching drive page:", e)

if __name__ == "__main__":
    check_drive()
