"""Run the notebook without Jekyll or third-party Python packages."""
from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
import argparse

parser = argparse.ArgumentParser()
parser.add_argument('--port', type=int, default=8765)
args = parser.parse_args()
root = Path(__file__).resolve().parent.parent
SimpleHTTPRequestHandler.extensions_map.update({'.mjs': 'text/javascript', '.js': 'text/javascript', '.json': 'application/json'})
print(f'Learning notebook: http://127.0.0.1:{args.port}/', flush=True)
print('Press Ctrl+C to stop.', flush=True)
ThreadingHTTPServer(('127.0.0.1', args.port), partial(SimpleHTTPRequestHandler, directory=str(root))).serve_forever()
