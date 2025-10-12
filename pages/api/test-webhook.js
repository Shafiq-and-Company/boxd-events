export default async function handler(req, res) {
  console.log('Test webhook endpoint called')
  console.log('Method:', req.method)
  console.log('Headers:', req.headers)
  console.log('Body:', req.body)
  
  res.status(200).json({ 
    message: 'Webhook endpoint is working',
    timestamp: new Date().toISOString(),
    method: req.method,
    hasBody: !!req.body
  })
}
