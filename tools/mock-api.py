"""A stand-in for the Google Apps Script, for testing the website on your own computer.

  python3 tools/mock-api.py            (serves http://localhost:5174/)
  then open  http://localhost:5173/?api=http://localhost:5174/   (the ?api= trick only works on localhost)

GET returns data/sample-content.json (re-read on every request, so you can edit it and reload).
POST accepts a contact message and prints it. Add ?fail=1 to the POST address in config to test errors.
"""
import json, os, sys, time
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DATA = os.environ.get('MOCK_DATA') or os.path.join(ROOT, 'data', 'sample-content.json')
DELAY = float(os.environ.get('MOCK_DELAY', '0.3'))      # seconds, to imitate Google's response time

class Handler(BaseHTTPRequestHandler):
    def _send(self, obj, status=200):
        body = json.dumps(obj).encode()
        self.send_response(status)
        self.send_header('Content-Type', 'application/json')
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Cache-Control', 'no-store')
        self.send_header('Content-Length', str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def do_OPTIONS(self):
        self.send_response(204)
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Headers', '*')
        self.end_headers()

    def do_GET(self):
        time.sleep(DELAY)
        if 'action=ping' in self.path:
            return self._send({'ok': True})
        with open(DATA) as f:
            return self._send(json.load(f))

    def do_POST(self):
        time.sleep(DELAY)
        n = int(self.headers.get('Content-Length', 0))
        try:
            msg = json.loads(self.rfile.read(n) or b'{}')
        except ValueError:
            return self._send({'ok': False, 'error': 'Bad request'}, 400)
        print('MESSAGE', msg, flush=True)
        if msg.get('message', '').strip().lower() == 'fail':
            return self._send({'ok': False, 'error': 'Sorry, the message could not be sent. Please email temasekclub.ch@gmail.com directly.'})
        return self._send({'ok': True})

    def log_message(self, *a):
        pass

if __name__ == '__main__':
    port = int(sys.argv[1]) if len(sys.argv) > 1 else 5174
    ThreadingHTTPServer(('', port), Handler).serve_forever()
