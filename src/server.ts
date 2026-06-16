import type { NextApiRequest, NextApiResponse } from 'next';
import { createServer } from 'http';
import { parse } from 'url';
import next from 'next';
import { initSocket } from '@/lib/socket';

const dev = process.env.NODE_ENV !== 'production';
const hostname = 'localhost';
const port = parseInt(process.env.PORT || '3000', 10);

const app = next({ dev, hostname, port });
const handle = app.getRequestHandler();

app.prepare().then(() => {
  const server = createServer((req, res) => {
    const parsedUrl = parse(req.url!, true);
    handle(req, res, parsedUrl);
  });

  initSocket(server);

  server.listen(port, () => {
    console.log(`> Server listening at http://${hostname}:${port}`);
  });
});
