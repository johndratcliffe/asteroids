const canvas = document.querySelector('canvas')
const ctx = canvas.getContext('2d')

canvas.width = window.innerWidth
canvas.height = window.innerHeight

const SPEED = 3
const ROTATIONAL_SPEED = 3
const FRICTION = 0.01
const PROJECTILE_SPEED = 2
const PI = Math.PI

const keys = {
  w: { pressed: false },
  a: { pressed: false },
  d: { pressed: false }
}

const projectiles = []
const asteroids = []

class Player {
  constructor ({ position, velocity }) {
    this.position = position
    this.velocity = velocity
    this.rotation = 0
  }

  draw () {
    ctx.save()
    ctx.fillStyle = 'black'
    ctx.fillRect(0, 0, canvas.width, canvas.height)

    // Apply rotation transformation
    ctx.translate(this.position.x, this.position.y)
    ctx.rotate(this.rotation)
    ctx.translate(-this.position.x, -this.position.y)

    // Draw the player triangle
    ctx.beginPath()
    ctx.moveTo(this.position.x + 20, this.position.y)
    ctx.lineTo(this.position.x - 10, this.position.y + 10)
    ctx.lineTo(this.position.x - 10, this.position.y - 10)
    ctx.closePath()

    ctx.strokeStyle = 'white'
    ctx.stroke()
    ctx.restore()
  }

  update () {
    this.draw()
    this.position.x += this.velocity.x
    this.position.y += this.velocity.y
  }
}

class Projectile {
  constructor ({ position, velocity }) {
    this.position = position
    this.velocity = velocity
    this.radius = 5
  }

  draw () {
    ctx.beginPath()
    ctx.arc(this.position.x, this.position.y, this.radius, 0, Math.PI * 2, false)
    ctx.closePath()

    ctx.fillStyle = 'white'
    ctx.fill()
  }

  update () {
    this.draw()
    this.position.x += this.velocity.x
    this.position.y += this.velocity.y
  }
}

class Asteroid {
  constructor ({ position, velocity, size }) {
    this.position = position
    this.velocity = velocity
    this.size = size
    this.despawnable = false
    this.vertices = []

    // Generate a polygon shape for the asteroid
    for (let i = 0; i < 16; i++) {
      this.vertices.push({
        x: this.position.x + this.dirX(this.size, i * PI / 8) + this.random(this.size),
        y: this.position.y + this.dirY(this.size, i * PI / 8) + this.random(this.size)
      })
    }
  }

  // Generate random offset for vertices to create irregular shape
  random (size) {
    const distance = 2 * size * Math.sqrt(1 - Math.cos(PI / 16))
    return distance * Math.random() - distance / 2
  }

  // Calculate x and y coordinates on a circle
  dirX (size, angle) {
    return size * Math.cos(angle)
  }

  dirY (size, angle) {
    return size * Math.sin(angle)
  }

  draw () {
    ctx.beginPath()
    ctx.moveTo(this.vertices[0].x, this.vertices[0].y)
    for (let i = 1; i < 16; i++) {
      ctx.lineTo(this.vertices[i].x, this.vertices[i].y)
    }
    ctx.closePath()

    ctx.strokeStyle = 'white'
    ctx.stroke()
  }

  update () {
    this.draw()
    this.position.x += this.velocity.x
    this.position.y += this.velocity.y
    for (let i = 0; i < 16; i++) {
      this.vertices[i].x += this.velocity.x
      this.vertices[i].y += this.velocity.y
    }
  }
}

const player = new Player({
  position: { x: canvas.width / 2, y: canvas.height / 2 },
  velocity: { x: 0, y: 0 }
})

// Spawn asteroids periodically
window.setInterval(() => {
  const quadrant = Math.floor(Math.random() * 4)
  let position, velocity
  const size = Math.random() * 100 + 20
  // Calculate buffer to ensure asteroid spawns fully off-screen
  const buffer = size + size * Math.sqrt(1 - Math.cos(PI / 16))
  const minSpeed = 0.5
  const maxSpeed = 2

  const centerX = canvas.width / 2
  const centerY = canvas.height / 2

  // Calculate velocity towards the center of the screen
  function getVelocityTowardsCenter (startX, startY) {
    const angle = Math.atan2(centerY - startY, centerX - startX)
    const speed = Math.random() * (maxSpeed - minSpeed) + minSpeed
    return {
      x: Math.cos(angle) * speed,
      y: Math.sin(angle) * speed
    }
  }

  // Determine spawn position based on quadrant
  switch (quadrant) {
    case 0: // Left
      position = { x: -buffer, y: Math.random() * canvas.height }
      velocity = getVelocityTowardsCenter(position.x, position.y)
      break
    case 1: // Top
      position = { x: Math.random() * canvas.width, y: -buffer }
      velocity = getVelocityTowardsCenter(position.x, position.y)
      break
    case 2: // Right
      position = { x: canvas.width + buffer, y: Math.random() * canvas.height }
      velocity = getVelocityTowardsCenter(position.x, position.y)
      break
    case 3: // Bottom
      position = { x: Math.random() * canvas.width, y: canvas.height + buffer }
      velocity = getVelocityTowardsCenter(position.x, position.y)
      break
  }

  // Add some randomness to the velocity
  velocity.x += (Math.random() - 0.5) * (maxSpeed / 2)
  velocity.y += (Math.random() - 0.5) * (maxSpeed / 2)

  asteroids.push(new Asteroid({ position, velocity, size }))
}, 2000)

// Helper function to calculate distance between two points
function distance (x1, y1, x2, y2) {
  return Math.sqrt((x2 - x1) ** 2 + (y2 - y1) ** 2)
}

// Helper function to calculate the distance from a point to a line segment
function distToSegment (x, y, x1, y1, x2, y2) {
  const A = x - x1
  const B = y - y1
  const C = x2 - x1
  const D = y2 - y1

  const dot = A * C + B * D
  const lenSq = C * C + D * D
  let param = -1
  // in case of 0 length line
  if (lenSq !== 0) { param = dot / lenSq }

  let xx, yy

  if (param < 0) {
    xx = x1
    yy = y1
  } else if (param > 1) {
    xx = x2
    yy = y2
  } else {
    xx = x1 + param * C
    yy = y1 + param * D
  }

  return distance(x, y, xx, yy)
}

// Updated collision detection function for circle-to-polygon
function checkCollision (projectile, asteroid) {
  // Check if the projectile's center is inside the asteroid's polygon
  let inside = false
  for (let i = 0, j = asteroid.vertices.length - 1; i < asteroid.vertices.length; j = i++) {
    const xi = asteroid.vertices[i].x; const yi = asteroid.vertices[i].y
    const xj = asteroid.vertices[j].x; const yj = asteroid.vertices[j].y

    const intersect = ((yi > projectile.position.y) !== (yj > projectile.position.y)) &&
        (projectile.position.x < (xj - xi) * (projectile.position.y - yi) / (yj - yi) + xi)
    if (intersect) inside = !inside
  }

  if (inside) return true

  // If not inside, check the distance to each edge of the polygon
  for (let i = 0, j = asteroid.vertices.length - 1; i < asteroid.vertices.length; j = i++) {
    const xi = asteroid.vertices[i].x; const yi = asteroid.vertices[i].y
    const xj = asteroid.vertices[j].x; const yj = asteroid.vertices[j].y

    if (distToSegment(projectile.position.x, projectile.position.y, xi, yi, xj, yj) <= projectile.radius) {
      return true
    }
  }

  return false
}

// Main game loop
function animate () {
  window.requestAnimationFrame(animate)
  player.update()

  // Update and remove off-screen projectiles
  for (let i = projectiles.length - 1; i >= 0; i--) {
    const projectile = projectiles[i]
    if (projectile.position.x - projectile.radius > canvas.innerWidth ||
        projectile.position.x + projectile.radius < 0 ||
        projectile.position.y - projectile.radius > canvas.innerHeight ||
        projectile.position.y + projectile.radius < 0) {
      projectiles.splice(i, 1)
    } else {
      projectile.update()
    }
  }

  // Update and remove off-screen asteroids
  for (let i = asteroids.length - 1; i >= 0; i--) {
    const asteroid = asteroids[i]
    let offScreenCount = 0
    let onScreenCount = 0

    // Check if asteroid is off-screen
    for (let v = 0; v < asteroid.vertices.length; v++) {
      const vertex = asteroid.vertices[v]
      if (vertex.x < 0 || vertex.x > canvas.width ||
          vertex.y < 0 || vertex.y > canvas.height) {
        offScreenCount++
      } else {
        onScreenCount++
      }
    }

    // Mark asteroid as despawnable once it has been on screen
    if (onScreenCount > 0) {
      asteroid.despawnable = true
    }

    // Remove asteroid if it's completely off-screen and has been on screen before
    if (offScreenCount === asteroid.vertices.length && asteroid.despawnable) {
      asteroids.splice(i, 1)
    } else {
      asteroid.update()
    }

    // Update and check collisions for projectiles
    for (let i = projectiles.length - 1; i >= 0; i--) {
      const projectile = projectiles[i]
      // Check for collisions with asteroids
      for (let j = asteroids.length - 1; j >= 0; j--) {
        const asteroid = asteroids[j]
        if (checkCollision(projectile, asteroid)) {
        // Collision detected, remove both projectile and asteroid
          projectiles.splice(i, 1)
          asteroids.splice(j, 1)
          break
        }
      }
    }
  }

  // collision handling
  // bullet ast
  // player ast

  // Handle player movement
  if (keys.w.pressed) {
    // Calculate velocity based on current rotation
    player.velocity.x = Math.cos(player.rotation) * SPEED
    player.velocity.y = Math.sin(player.rotation) * SPEED
  } else if (!keys.w.pressed) {
    // Apply friction when not accelerating
    player.velocity.x *= 1 - FRICTION
    player.velocity.y *= 1 - FRICTION
  }
  if (keys.a.pressed) player.rotation -= 0.01 * ROTATIONAL_SPEED
  else if (keys.d.pressed) player.rotation += 0.01 * ROTATIONAL_SPEED
}

animate()

window.addEventListener('keydown', (event) => {
  switch (event.code) {
    case 'KeyW':
      keys.w.pressed = true
      break
    case 'KeyA':
      keys.a.pressed = true
      break
    case 'KeyD':
      keys.d.pressed = true
      break
    case 'Space':
      // Create a new projectile when spacebar is pressed
      projectiles.push(new Projectile({
        position: {
          x: player.position.x + Math.cos(player.rotation) * 20,
          y: player.position.y + Math.sin(player.rotation) * 20
        },
        velocity: {
          x: Math.cos(player.rotation) * PROJECTILE_SPEED,
          y: Math.sin(player.rotation) * PROJECTILE_SPEED
        }
      }))
      break
  }
})

window.addEventListener('keyup', (event) => {
  switch (event.code) {
    case 'KeyW':
      keys.w.pressed = false
      break
    case 'KeyA':
      keys.a.pressed = false
      break
    case 'KeyD':
      keys.d.pressed = false
      break
  }
})
