// /api/desktop/* 远程桌面（VNC + Xvfb + ffmpeg 截屏 + 输入注入）
// 原 server/index.js 第 1829-2480 行。

import { Router } from 'express'
import { randomUUID } from 'crypto'
import { existsSync, readdirSync, statSync } from 'fs'
import { spawn } from 'child_process'
import { state } from '../lib/state.js'
import { authMiddleware } from '../lib/auth.js'

const router = Router()

// ============ Remote Desktop API ============

// spawn 已在顶部静态 import

async function findFreeDisplay() {
  for (let i = 99; i >= 1; i--) {
    const lockFile = `/tmp/.X${i}-lock`
    if (!existsSync(lockFile)) {
      return i
    }
  }
  return 99
}

async function startXvfbDisplay(width, height, depth = 24) {
  const displayNum = await findFreeDisplay()
  const display = `:${displayNum}`
  
  const xvfb = spawn('Xvfb', [
    display,
    '-screen', '0', `${width}x${height}x${depth}`,
    '-ac',
    '-nolisten', 'tcp',
  ], {
    stdio: ['ignore', 'pipe', 'pipe'],
  })
  
  await new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      reject(new Error('Xvfb startup timeout'))
    }, 5000)
    
    xvfb.on('error', (err) => {
      clearTimeout(timeout)
      reject(err)
    })
    
    setTimeout(() => {
      clearTimeout(timeout)
      resolve(true)
    }, 500)
  })
  
  return { display, process: xvfb }
}

async function startX11vnc(display, password) {
  const args = [
    '-display', display,
    '-forever',
    '-shared',
    '-rfbport', '0',
    '-nopw',
  ]
  
  if (password) {
    args.push('-passwd', password)
  }
  
  const vnc = spawn('x11vnc', args, {
    stdio: ['ignore', 'pipe', 'pipe'],
  })
  
  let port = null
  await new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      reject(new Error('x11vnc startup timeout'))
    }, 10000)
    
    vnc.stderr.on('data', (data) => {
      const str = data.toString()
      const portMatch = str.match(/PORT=(\d+)/)
      if (portMatch) {
        port = parseInt(portMatch[1], 10)
        clearTimeout(timeout)
        resolve(true)
      }
    })
    
    vnc.on('error', (err) => {
      clearTimeout(timeout)
      reject(err)
    })
  })
  
  return { process: vnc, port }
}

function startFFmpegCapture(display, width, height, fps = 15, quality = 5) {
  const args = [
    '-f', 'x11grab',
    '-draw_mouse', '1',
    '-video_size', `${width}x${height}`,
    '-framerate', String(fps),
    '-i', display,
    '-vf', `scale=${width}:${height}`,
    '-f', 'image2pipe',
    '-vcodec', 'mjpeg',
    '-q:v', String(quality),
    '-',
  ]
  
  const ffmpeg = spawn('ffmpeg', args, {
    stdio: ['ignore', 'pipe', 'pipe'],
  })
  
  return ffmpeg
}

function parseMJPEGFrames(ffmpeg, onFrame) {
  let buffer = Buffer.alloc(0)
  const SOI = Buffer.from([0xFF, 0xD8])
  const EOI = Buffer.from([0xFF, 0xD9])
  
  ffmpeg.stdout.on('data', (chunk) => {
    buffer = Buffer.concat([buffer, chunk])
    
    let start = 0
    while (true) {
      const soiIndex = buffer.indexOf(SOI, start)
      if (soiIndex === -1) break
      
      const eoiIndex = buffer.indexOf(EOI, soiIndex)
      if (eoiIndex === -1) break
      
      const frame = buffer.slice(soiIndex, eoiIndex + 2)
      onFrame(frame)
      start = eoiIndex + 2
    }
    
    if (start > 0) {
      buffer = buffer.slice(start)
    }
  })
  
  return ffmpeg
}

async function captureLinuxDesktopFast(display, width, height, quality = 30) {
  return new Promise((resolve) => {
    const args = [
      '-f', 'x11grab',
      '-draw_mouse', '1',
      '-video_size', `${width}x${height}`,
      '-i', display,
      '-vframes', '1',
      '-f', 'image2pipe',
      '-vcodec', 'mjpeg',
      '-q:v', String(quality),
      '-',
    ]
    
    const proc = spawn('ffmpeg', args, {
      stdio: ['ignore', 'pipe', 'pipe'],
    })
    
    const chunks = []
    proc.stdout.on('data', (chunk) => chunks.push(chunk))
    proc.on('close', () => {
      if (chunks.length > 0) {
        resolve(Buffer.concat(chunks))
      } else {
        resolve(null)
      }
    })
    proc.on('error', () => resolve(null))
  })
}

async function captureLinuxDesktop(display, width, height) {
  return captureLinuxDesktopFast(display, width, height, 30)
}

async function captureWindowsDesktop() {
  return new Promise((resolve) => {
    const script = `
      Add-Type -AssemblyName System.Windows.Forms
      Add-Type -AssemblyName System.Drawing
      $screen = [System.Windows.Forms.Screen]::PrimaryScreen.Bounds
      $bitmap = New-Object System.Drawing.Bitmap($screen.Width, $screen.Height)
      $graphics = [System.Drawing.Graphics]::FromImage($bitmap)
      $graphics.CopyFromScreen($screen.Location, [System.Drawing.Point]::Empty, $screen.Size)
      $encoder = [System.Drawing.Imaging.ImageCodecInfo]::GetImageEncoders() | Where-Object { $_.MimeType -eq 'image/jpeg' }
      $params = New-Object System.Drawing.Imaging.EncoderParameters(1)
      $params.Param[0] = New-Object System.Drawing.Imaging.EncoderParameter([System.Drawing.Imaging.Encoder]::Quality, 50L)
      $stream = New-Object System.IO.MemoryStream
      $bitmap.Save($stream, $encoder, $params)
      [Convert]::ToBase64String($stream.ToArray())
    `
    
    const proc = spawn('powershell', ['-NoProfile', '-Command', script], {
      stdio: ['ignore', 'pipe', 'pipe'],
    })
    
    let output = ''
    proc.stdout.on('data', (data) => output += data.toString())
    proc.on('close', () => {
      if (output) {
        try {
          resolve(Buffer.from(output.trim(), 'base64'))
        } catch {
          resolve(null)
        }
      } else {
        resolve(null)
      }
    })
    proc.on('error', () => resolve(null))
  })
}

router.get('/api/desktop/displays', authMiddleware, (req, res) => {
  if (process.platform === 'win32') {
    return res.json({ ok: true, displays: [], platform: 'windows' })
  }
  
  const displays = []
  const tmpDir = '/tmp'
  
  try {
    const files = readdirSync(tmpDir)
    const lockPattern = /^\.X(\d+)-lock$/
    
    for (const file of files) {
      const match = file.match(lockPattern)
      if (match) {
        const displayNum = match[1]
        displays.push({
          display: `:${displayNum}`,
          number: parseInt(displayNum, 10),
        })
      }
    }
    
    displays.sort((a, b) => b.number - a.number)
  } catch (e) {
    console.error('[Desktop] Failed to list displays:', e.message)
  }
  
  res.json({ ok: true, displays, platform: 'linux' })
})

router.get('/api/desktop/list', authMiddleware, (req, res) => {
  const sessions = []
  for (const [id, session] of state.desktopSessions) {
    sessions.push({
      id,
      nodeId: session.nodeId,
      nodeName: session.nodeName,
      platform: session.platform,
      status: session.status,
      width: session.width,
      height: session.height,
      createdAt: session.createdAt,
      lastActivityAt: session.lastActivityAt,
    })
  }
  res.json({ ok: true, sessions })
})

router.post('/api/desktop/create', authMiddleware, async (req, res) => {
  const { nodeId, width, height, host, port, password, display: inputDisplay } = req.body
  
  const sessionId = randomUUID()
  const platform = process.platform === 'win32' ? 'windows' : 'linux'
  
  const session = {
    id: sessionId,
    nodeId: nodeId || 'local',
    nodeName: nodeId || 'local',
    platform,
    status: 'creating',
    width: width || 1024,
    height: height || 768,
    host: host || 'localhost',
    port: port || 5900,
    password: password || '',
    createdAt: Date.now(),
    lastActivityAt: Date.now(),
    clients: new Set(),
    xvfbProcess: null,
    vncProcess: null,
    ffmpegProcess: null,
    display: null,
    frameBuffer: null,
    isExternalDisplay: false,
  }
  
  state.desktopSessions.set(sessionId, session)
  
  try {
    if (platform === 'linux') {
      if (inputDisplay) {
        console.log(`[Desktop] Using existing display ${inputDisplay} for session ${sessionId}...`)
        session.display = inputDisplay
        session.isExternalDisplay = true
      } else {
        console.log(`[Desktop] Starting Xvfb for session ${sessionId}...`)
        const { display, process: xvfb } = await startXvfbDisplay(session.width, session.height)
        session.display = display
        session.xvfbProcess = xvfb
        console.log(`[Desktop] Xvfb started on display ${display}`)
        
        try {
          console.log(`[Desktop] Starting x11vnc for session ${sessionId}...`)
          const { process: vnc, port: vncPort } = await startX11vnc(display, session.password)
          session.vncProcess = vnc
          session.port = vncPort
          console.log(`[Desktop] x11vnc started on port ${vncPort}`)
        } catch (vncErr) {
          console.log(`[Desktop] x11vnc not available, using screen capture: ${vncErr.message}`)
        }
        
        xvfb.on('exit', (code) => {
          console.log(`[Desktop] Xvfb exited for session ${sessionId} with code ${code}`)
          session.status = 'error'
        })
      }
    }
    
    session.status = 'ready'
    res.json({
      ok: true,
      sessionId,
      message: 'Desktop session created. Connect via SSE stream.',
      width: session.width,
      height: session.height,
      platform: session.platform,
      display: session.display,
      vncPort: session.port,
      isExternalDisplay: session.isExternalDisplay,
    })
  } catch (err) {
    console.error(`[Desktop] Failed to create session ${sessionId}:`, err.message)
    session.status = 'error'
    res.status(500).json({
      ok: false,
      error: { message: `Failed to create desktop session: ${err.message}` },
    })
  }
})

router.get('/api/desktop/stream', authMiddleware, (req, res) => {
  const sessionId = req.query.sessionId
  
  if (!sessionId) {
    return res.status(400).json({ ok: false, error: { message: 'sessionId is required' } })
  }
  
  const session = state.desktopSessions.get(sessionId)
  if (!session) {
    return res.status(404).json({ ok: false, error: { message: 'Session not found' } })
  }
  
  res.setHeader('Content-Type', 'text/event-stream')
  res.setHeader('Cache-Control', 'no-cache')
  res.setHeader('Connection', 'keep-alive')
  res.setHeader('X-Accel-Buffering', 'no')
  res.flushHeaders()
  
  const sendEvent = (type, data = {}) => {
    const event = { type, sessionId, ...data }
    res.write(`data: ${JSON.stringify(event)}\n\n`)
  }
  
  session.clients.add(res)
  session.status = 'connected'
  session.lastActivityAt = Date.now()
  
  console.log(`[Desktop] Client connected to session ${sessionId}`)
  sendEvent('connected', { width: session.width, height: session.height })
  
  let ffmpegProcess = null
  let frameCount = 0
  let lastFrameTime = Date.now()
  
  if (session.platform === 'linux' && session.display) {
    ffmpegProcess = startFFmpegCapture(session.display, session.width, session.height, 15, 5)
    
    parseMJPEGFrames(ffmpegProcess, (frame) => {
      frameCount++
      const now = Date.now()
      if (now - lastFrameTime >= 100) {
        session.frameBuffer = frame
        sendEvent('frame', { 
          data: frame.toString('base64'),
          width: session.width,
          height: session.height,
          fps: Math.round(frameCount * 1000 / (now - lastFrameTime)),
        })
        frameCount = 0
        lastFrameTime = now
      }
    })
    
    ffmpegProcess.on('error', (err) => {
      console.error(`[Desktop] FFmpeg error for session ${sessionId}:`, err.message)
    })
    
    ffmpegProcess.on('exit', (code) => {
      console.log(`[Desktop] FFmpeg exited for session ${sessionId} with code ${code}`)
    })
  } else if (session.platform === 'windows') {
    const captureFrame = async () => {
      try {
        const frameBuffer = await captureWindowsDesktop()
        if (frameBuffer) {
          session.frameBuffer = frameBuffer
          sendEvent('frame', { 
            data: frameBuffer.toString('base64'),
            width: session.width,
            height: session.height,
          })
        }
      } catch (err) {
        console.error(`[Desktop] Frame capture error for session ${sessionId}:`, err.message)
      }
    }
    
    const frameInterval = setInterval(captureFrame, 100)
    
    req.on('close', () => {
      clearInterval(frameInterval)
      session.clients.delete(res)
      console.log(`[Desktop] Client disconnected from session ${sessionId}`)
      if (session.clients.size === 0) {
        session.status = 'disconnected'
      }
    })
    
    return
  }
  
  req.on('close', () => {
    if (ffmpegProcess) {
      ffmpegProcess.kill()
    }
    session.clients.delete(res)
    console.log(`[Desktop] Client disconnected from session ${sessionId}`)
    if (session.clients.size === 0) {
      session.status = 'disconnected'
    }
  })
})

router.post('/api/desktop/input/mouse', authMiddleware, (req, res) => {
  const { sessionId, x, y, button, buttons, type, wheelDeltaX, wheelDeltaY } = req.body
  
  if (!sessionId) {
    return res.status(400).json({ ok: false, error: { message: 'sessionId is required' } })
  }
  
  const session = state.desktopSessions.get(sessionId)
  if (!session) {
    return res.status(404).json({ ok: false, error: { message: 'Session not found' } })
  }
  
  session.lastActivityAt = Date.now()
  
  if (session.platform === 'linux' && session.display) {
    try {
      let cmd = ''
      if (type === 'mousemove') {
        cmd = `DISPLAY=${session.display} xdotool mousemove ${x} ${y}`
      } else if (type === 'click') {
        const btn = button === 2 ? 3 : button === 3 ? 2 : button
        cmd = `DISPLAY=${session.display} xdotool mousemove ${x} ${y} click ${btn + 1}`
      } else if (type === 'wheel') {
        const deltaY = wheelDeltaY || 0
        const btn = deltaY > 0 ? 5 : 4
        const clicks = Math.abs(deltaY) > 50 ? 3 : 1
        cmd = `DISPLAY=${session.display} xdotool click --repeat ${clicks} ${btn}`
      }
      
      if (cmd) {
        spawn('sh', ['-c', cmd])
      }
    } catch (e) {
      console.error('[Desktop] Mouse input error:', e.message)
    }
  }
  
  res.json({ ok: true })
})

router.post('/api/desktop/input/keyboard', authMiddleware, (req, res) => {
  const { sessionId, key, code, keyCode, shiftKey, ctrlKey, altKey, metaKey, type } = req.body
  
  if (!sessionId) {
    return res.status(400).json({ ok: false, error: { message: 'sessionId is required' } })
  }
  
  const session = state.desktopSessions.get(sessionId)
  if (!session) {
    return res.status(404).json({ ok: false, error: { message: 'Session not found' } })
  }
  
  session.lastActivityAt = Date.now()
  
  if (session.platform === 'linux' && session.display) {
    try {
      let keyName = key
      const specialKeys = {
        'Enter': 'Return',
        'Escape': 'Escape',
        'Backspace': 'BackSpace',
        'Tab': 'Tab',
        'ArrowUp': 'Up',
        'ArrowDown': 'Down',
        'ArrowLeft': 'Left',
        'ArrowRight': 'Right',
        'Control': 'Control_L',
        'Shift': 'Shift_L',
        'Alt': 'Alt_L',
        'Meta': 'Super_L',
        ' ': 'space',
      }
      
      if (specialKeys[key]) {
        keyName = specialKeys[key]
      }
      
      const modifiers = []
      if (ctrlKey) modifiers.push('ctrl')
      if (shiftKey) modifiers.push('shift')
      if (altKey) modifiers.push('alt')
      if (metaKey) modifiers.push('super')
      
      let cmd = ''
      if (type === 'keydown') {
        if (modifiers.length > 0) {
          cmd = `DISPLAY=${session.display} xdotool keydown ${modifiers.map(m => m).join(' ')} ${keyName}`
        } else {
          cmd = `DISPLAY=${session.display} xdotool keydown ${keyName}`
        }
      } else if (type === 'keyup') {
        cmd = `DISPLAY=${session.display} xdotool keyup ${keyName}`
      }
      
      if (cmd) {
        spawn('sh', ['-c', cmd])
      }
    } catch (e) {
      console.error('[Desktop] Keyboard input error:', e.message)
    }
  }
  
  res.json({ ok: true })
})

router.post('/api/desktop/input/clipboard', authMiddleware, (req, res) => {
  const { sessionId, text } = req.body
  
  if (!sessionId) {
    return res.status(400).json({ ok: false, error: { message: 'sessionId is required' } })
  }
  
  const session = state.desktopSessions.get(sessionId)
  if (!session) {
    return res.status(404).json({ ok: false, error: { message: 'Session not found' } })
  }
  
  session.lastActivityAt = Date.now()
  
  res.json({ ok: true })
})

router.post('/api/desktop/resize', authMiddleware, (req, res) => {
  const { sessionId, width, height } = req.body
  
  if (!sessionId) {
    return res.status(400).json({ ok: false, error: { message: 'sessionId is required' } })
  }
  
  const session = state.desktopSessions.get(sessionId)
  if (!session) {
    return res.status(404).json({ ok: false, error: { message: 'Session not found' } })
  }
  
  session.width = width || session.width
  session.height = height || session.height
  session.lastActivityAt = Date.now()
  
  for (const client of session.clients) {
    try {
      client.write(`data: ${JSON.stringify({ type: 'resized', sessionId, width: session.width, height: session.height })}\n\n`)
    } catch (e) {}
  }
  
  res.json({ ok: true, width: session.width, height: session.height })
})

router.post('/api/desktop/destroy', authMiddleware, (req, res) => {
  const { sessionId } = req.body
  
  if (!sessionId) {
    return res.status(400).json({ ok: false, error: { message: 'sessionId is required' } })
  }
  
  const session = state.desktopSessions.get(sessionId)
  if (!session) {
    return res.json({ ok: true, message: 'Session already destroyed' })
  }
  
  for (const client of session.clients) {
    try {
      client.write(`data: ${JSON.stringify({ type: 'disconnected', sessionId, message: 'Session destroyed' })}\n\n`)
      client.end()
    } catch (e) {}
  }
  
  if (session.ffmpegProcess) {
    try {
      session.ffmpegProcess.kill()
      console.log(`[Desktop] FFmpeg killed for session ${sessionId}`)
    } catch (e) {}
  }
  
  if (session.vncProcess) {
    try {
      session.vncProcess.kill()
      console.log(`[Desktop] x11vnc killed for session ${sessionId}`)
    } catch (e) {}
  }
  
  if (session.xvfbProcess) {
    try {
      session.xvfbProcess.kill()
      console.log(`[Desktop] Xvfb killed for session ${sessionId}`)
    } catch (e) {}
  }
  
  state.desktopSessions.delete(sessionId)
  console.log(`[Desktop] Session ${sessionId} destroyed`)
  res.json({ ok: true })
})

router.post('/api/desktop/heartbeat', authMiddleware, (req, res) => {
  const { sessionId } = req.body
  
  if (!sessionId) {
    return res.status(400).json({ ok: false, error: { message: 'sessionId is required' } })
  }
  
  const session = state.desktopSessions.get(sessionId)
  if (!session) {
    return res.status(404).json({ ok: false, error: { message: 'Session not found' } })
  }
  
  session.lastHeartbeat = Date.now()
  res.json({ ok: true })
})

function keyCodeToX11KeySym(keyCode, key) {
  const keyMap = {
    8: 0xFF08,
    9: 0xFF09,
    13: 0xFF0D,
    16: 0xFFE1,
    17: 0xFFE3,
    18: 0xFFE9,
    19: 0xFF13,
    20: 0xFFE5,
    27: 0xFF1B,
    32: 0x0020,
    33: 0xFF55,
    34: 0xFF56,
    35: 0xFF57,
    36: 0xFF50,
    37: 0xFF51,
    38: 0xFF52,
    39: 0xFF53,
    40: 0xFF54,
    45: 0xFF63,
    46: 0xFFFF,
    91: 0xFFEB,
    92: 0xFF67,
    93: 0xFF67,
    112: 0xFFBE,
    113: 0xFFBF,
    114: 0xFFC0,
    115: 0xFFC1,
    116: 0xFFC2,
    117: 0xFFC3,
    118: 0xFFC4,
    119: 0xFFC5,
    120: 0xFFC6,
    121: 0xFFC7,
    122: 0xFFC8,
    123: 0xFFC9,
    144: 0xFF7F,
    145: 0xFF14,
    186: 0x003B,
    187: 0x003D,
    188: 0x002C,
    189: 0x002D,
    190: 0x002E,
    191: 0x002F,
    192: 0x0060,
    219: 0x005B,
    220: 0x005C,
    221: 0x005D,
    222: 0x0027,
  }
  
  if (keyMap[keyCode]) {
    return keyMap[keyCode]
  }
  
  if (key && key.length === 1) {
    return key.charCodeAt(0)
  }
  
  return keyCode
}

export default router
