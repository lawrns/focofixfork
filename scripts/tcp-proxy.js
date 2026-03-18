const net = require('net')

const bindHost = process.env.PROXY_BIND_HOST || '100.118.211.55'
const bindPort = Number(process.env.PROXY_BIND_PORT || '4000')
const targetHost = process.env.PROXY_TARGET_HOST || '127.0.0.1'
const targetPort = Number(process.env.PROXY_TARGET_PORT || '4000')

const server = net.createServer((client) => {
  const upstream = net.connect({ host: targetHost, port: targetPort })

  client.pipe(upstream)
  upstream.pipe(client)

  const teardown = () => {
    client.destroy()
    upstream.destroy()
  }

  client.on('error', teardown)
  upstream.on('error', teardown)
})

server.on('error', (error) => {
  console.error(`[tcp-proxy] ${error.message}`)
  process.exit(1)
})

server.listen(bindPort, bindHost, () => {
  console.log(
    `[tcp-proxy] listening on ${bindHost}:${bindPort} -> ${targetHost}:${targetPort}`,
  )
})
