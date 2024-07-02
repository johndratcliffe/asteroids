// Get the canvas element and its 2D rendering context
const canvas = document.querySelector('canvas')
const ctx = canvas.getContext('2d')

// Set canvas dimensions to match the window size
canvas.width = window.innerWidth
canvas.height = window.innerHeight

// Game constants
const SPEED = 2
const ROTATIONAL_SPEED = 3
const FRICTION = 0.01
const PROJECTILE_SPEED = 5
const PI = Math.PI
let score = 0
let highScore = 0

// Object to track key presses
const keys = {
  w: { pressed: false },
  a: { pressed: false },
  d: { pressed: false }
}

// Arrays to store game objects
const projectiles = []
const asteroids = []

// Player class definition
class Player {
  constructor ({ position, velocity }) {
    this.position = position
    this.velocity = velocity
    this.rotation = 0
    this.vertices = []
    this.size = 20
    this.thrust = 0.02
    this.updateVertices()
  }

  // Update player's triangle vertices based on position and rotation
  updateVertices () {
    const cos = Math.cos(this.rotation)
    const sin = Math.sin(this.rotation)
    this.vertices = [
      {
        x: this.position.x + this.size * cos,
        y: this.position.y + this.size * sin
      },
      {
        x: this.position.x - this.size * cos + this.size / 2 * sin,
        y: this.position.y - this.size * sin - this.size / 2 * cos
      },
      {
        x: this.position.x - this.size * cos - this.size / 2 * sin,
        y: this.position.y - this.size * sin + this.size / 2 * cos
      }
    ]
  }

  // Draw the player on the canvas
  draw () {
    ctx.beginPath()
    ctx.moveTo(this.vertices[0].x, this.vertices[0].y)
    ctx.lineTo(this.vertices[1].x, this.vertices[1].y)
    ctx.lineTo(this.vertices[2].x, this.vertices[2].y)
    ctx.closePath()

    ctx.strokeStyle = 'white'
    ctx.stroke()
  }

  // Update player's position and redraw
  update () {
    // Update position
    this.position.x += this.velocity.x
    this.position.y += this.velocity.y

    // Wrap around screen edges
    this.position.x = (this.position.x + canvas.width) % canvas.width
    this.position.y = (this.position.y + canvas.height) % canvas.height

    this.updateVertices()
    this.draw()
  }
}

// Projectile class definition
class Projectile {
  constructor ({ position, velocity }) {
    this.position = position
    this.velocity = velocity
    this.radius = 5
    this.active = true
  }

  // Draw the projectile on the canvas
  draw () {
    ctx.beginPath()
    ctx.arc(this.position.x, this.position.y, this.radius, 0, Math.PI * 2, false)
    ctx.closePath()

    ctx.fillStyle = 'white'
    ctx.fill()
  }

  // Update projectile's position and redraw
  update () {
    this.draw()
    this.position.x += this.velocity.x
    this.position.y += this.velocity.y
  }

  // Check if the projectile is off-screen
  isOffScreen () {
    return (
      this.position.x - this.radius > canvas.width ||
      this.position.x + this.radius < 0 ||
      this.position.y - this.radius > canvas.height ||
      this.position.y + this.radius < 0
    )
  }
}

// Asteroid class definition
class Asteroid {
  constructor ({ position, velocity, size, rank }) {
    this.position = position
    this.velocity = velocity
    this.despawnable = false
    this.active = true
    this.rank = rank
    this.size = size
    this.vertices = this.generateVertices()
    this.collided = false
  }

  // Generate random vertices for the asteroid
  generateVertices () {
    const vertices = []
    for (let i = 0; i < 16; i++) {
      vertices.push({
        x: this.position.x + this.dirX(this.size, i * PI / 8) + this.random(this.size),
        y: this.position.y + this.dirY(this.size, i * PI / 8) + this.random(this.size)
      })
    }
    return vertices
  }

  // Generate random offset for vertices
  random (size) {
    const distance = 2 * size * Math.sqrt(1 - Math.cos(PI / 16))
    return distance * Math.random() - distance / 2
  }

  // Calculate x-coordinate on a circle
  dirX (size, angle) {
    return size * Math.cos(angle)
  }

  // Calculate y-coordinate on a circle
  dirY (size, angle) {
    return size * Math.sin(angle)
  }

  // Draw the asteroid on the canvas
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

  // Update asteroid's position and redraw
  update () {
    this.draw()
    this.position.x += this.velocity.x
    this.position.y += this.velocity.y
    for (let i = 0; i < 16; i++) {
      this.vertices[i].x += this.velocity.x
      this.vertices[i].y += this.velocity.y
    }
  }

  // Check if the asteroid is off-screen
  isOffScreen () {
    return this.vertices.every(
      vertex =>
        vertex.x < 0 ||
        vertex.x > canvas.width ||
        vertex.y < 0 ||
        vertex.y > canvas.height
    )
  }
}

// Create the player
let player = new Player({
  position: { x: canvas.width / 2, y: canvas.height / 2 },
  velocity: { x: 0, y: 0 }
})

// Generate properties for a new asteroid
function generateAsteroidProperties (posX, posY, r) {
  const quadrant = Math.floor(Math.random() * 4)
  let position, velocity
  let rank = Math.floor(Math.random() * 4 + 1)
  let size = rank * 30
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

  if (posX !== undefined) {
    position = { x: posX, y: posY }
    velocity = {
      x: (Math.random() - 0.5) * 2 * (maxSpeed - minSpeed) + minSpeed,
      y: (Math.random() - 0.5) * 2 * (maxSpeed - minSpeed) + minSpeed
    }
    rank = r
    size = rank * 30
  }

  return { position, velocity, size, rank }
}

// Spawn asteroids periodically
let interval = window.setInterval(intervalFunc, 2000)

function intervalFunc () {
  let asteroid = asteroids.find(a => !a.active)
  if (!asteroid) {
    const props = generateAsteroidProperties()
    asteroid = new Asteroid(props)
    asteroids.push(asteroid)
  } else {
    const props = generateAsteroidProperties()
    Object.assign(asteroid, props)
    asteroid.vertices = asteroid.generateVertices()
    asteroid.collided = false
  }
  asteroid.active = true
  asteroid.despawnable = false
}

// Check collision between a projectile and an asteroid
function checkProjectileCollision (projectile, asteroid) {
  // Check if the projectile is inside the asteroid
  let inside = false
  for (let i = 0, j = asteroid.vertices.length - 1; i < asteroid.vertices.length; j = i++) {
    const xi = asteroid.vertices[i].x; const yi = asteroid.vertices[i].y
    const xj = asteroid.vertices[j].x; const yj = asteroid.vertices[j].y

    const intersect = ((yi > projectile.position.y) !== (yj > projectile.position.y)) &&
        (projectile.position.x < (xj - xi) * (projectile.position.y - yi) / (yj - yi) + xi)
    if (intersect) inside = !inside
  }

  if (inside) return true

  // Check if the projectile is close to any edge of the asteroid
  for (let i = 0, j = asteroid.vertices.length - 1; i < asteroid.vertices.length; j = i++) {
    const xi = asteroid.vertices[i].x; const yi = asteroid.vertices[i].y
    const xj = asteroid.vertices[j].x; const yj = asteroid.vertices[j].y

    if (distToSegment(projectile.position.x, projectile.position.y, xi, yi, xj, yj) <= projectile.radius) {
      return true
    }
  }

  return false
}

// Check collision between two polygons using Separating Axis Theorem (SAT)
function checkPolygonCollision (polygon1, polygon2) {
  const polygons = [polygon1, polygon2]

  for (let i = 0; i < polygons.length; i++) {
    const polygon = polygons[i]
    for (let j = 0; j < polygon.length; j++) {
      const p1 = polygon[j]
      const p2 = polygon[(j + 1) % polygon.length]
      const normal = { x: p2.y - p1.y, y: p1.x - p2.x }

      let minA = Infinity; let maxA = -Infinity; let minB = Infinity; let maxB = -Infinity

      for (const p of polygon1) {
        const projected = normal.x * p.x + normal.y * p.y
        minA = Math.min(minA, projected)
        maxA = Math.max(maxA, projected)
      }

      for (const p of polygon2) {
        const projected = normal.x * p.x + normal.y * p.y
        minB = Math.min(minB, projected)
        maxB = Math.max(maxB, projected)
      }

      if (maxA < minB || maxB < minA) {
        return false
      }
    }
  }

  return true
}

// Calculate distance between two points
function distance (x1, y1, x2, y2) {
  return Math.sqrt((x2 - x1) ** 2 + (y2 - y1) ** 2)
}

// Calculate distance from a point to a line segment
function distToSegment (x, y, x1, y1, x2, y2) {
  const A = x - x1
  const B = y - y1
  const C = x2 - x1
  const D = y2 - y1

  const dot = A * C + B * D
  const lenSq = C * C + D * D
  let param = -1
  if (lenSq !== 0) param = dot / lenSq

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

// Main game loop
function animate () {
  window.requestAnimationFrame(animate)
  ctx.fillStyle = 'black'
  ctx.fillRect(0, 0, canvas.width, canvas.height)
  ctx.fillStyle = 'white'
  ctx.font = '50px Arial'
  ctx.fillText('Score: ' + score, 20, 60)
  ctx.fillText('High Score: ' + highScore, 20, 110)

  player.update()

  const activeProjectiles = []
  const activeAsteroids = []

  // Update and filter active projectiles
  for (let i = projectiles.length - 1; i >= 0; i--) {
    const projectile = projectiles[i]
    if (projectile.active) {
      projectile.update()
      if (projectile.isOffScreen()) {
        projectile.active = false
      } else {
        activeProjectiles.push(projectile)
      }
    } else {
      projectiles.splice(i, 1)
    }
  }

  // Update and filter active asteroids
  for (let i = asteroids.length - 1; i >= 0; i--) {
    const asteroid = asteroids[i]
    if (asteroid.active) {
      asteroid.update()
      if (asteroid.isOffScreen()) {
        if (asteroid.despawnable) {
          asteroids.splice(i, 1)
        }
      } else {
        asteroid.despawnable = true
        activeAsteroids.push(asteroid)
      }
    } else {
      asteroids.splice(i, 1)
    }
  }

  // Check collisions between player and asteroids
  for (const asteroid of activeAsteroids) {
    if (checkPolygonCollision(player.vertices, asteroid.vertices)) {
      console.log(asteroids)
      console.log(projectiles)
      score = 0
      window.clearInterval(interval)
      interval = window.setInterval(intervalFunc, 2000)
      projectiles.splice(0, projectiles.length)
      asteroids.splice(0, asteroids.length)
      player = new Player({
        position: { x: canvas.width / 2, y: canvas.height / 2 },
        velocity: { x: 0, y: 0 }
      })
      return
    }
  }

  // Check collisions between projectiles and asteroids
  for (const projectile of activeProjectiles) {
    for (const asteroid of activeAsteroids) {
      if (checkProjectileCollision(projectile, asteroid)) {
        projectile.active = false
        asteroid.active = false
        score += (5 - asteroid.rank) * 25
        highScore = Math.max(score, highScore)
        if (asteroid.rank > 1) {
          const newAsteroid1 = new Asteroid(generateAsteroidProperties(asteroid.position.x,
            asteroid.position.y, asteroid.rank - 1))
          const newAsteroid2 = new Asteroid(generateAsteroidProperties(asteroid.position.x,
            asteroid.position.y, asteroid.rank - 1))
          newAsteroid1.collided = newAsteroid2
          newAsteroid2.collided = newAsteroid1
          asteroids.push(newAsteroid1)
          asteroids.push(newAsteroid2)
          activeAsteroids.push(newAsteroid1)
          activeAsteroids.push(newAsteroid2)
        }
        break
      }
    }
  }

  // Check collisions between asteroids
  if (activeAsteroids.length > 1) {
    for (const asteroid1 of activeAsteroids) {
      for (const asteroid2 of activeAsteroids) {
        if (asteroid1 !== asteroid2) {
          if (asteroid1.collided === asteroid2 && asteroid2.collided === asteroid1) break
          if (checkPolygonCollision(asteroid1.vertices, asteroid2.vertices)) {
            asteroid1.collided = asteroid2
            asteroid2.collided = asteroid1
            const sizeRatio = asteroid1.size / asteroid2.size
            const tempX = asteroid1.velocity.x * sizeRatio
            const tempY = asteroid1.velocity.y * sizeRatio
            asteroid1.velocity.x = asteroid2.velocity.x / sizeRatio
            asteroid1.velocity.y = asteroid2.velocity.y / sizeRatio
            asteroid2.velocity.x = tempX
            asteroid2.velocity.y = tempY
            break
          }
        }
      }
    }
  }

  // Handle player movement
  if (keys.w.pressed) {
    // Calculate velocity based on current rotation
    player.velocity.x += Math.cos(player.rotation) * player.thrust
    player.velocity.y += Math.sin(player.rotation) * player.thrust
    const currentSpeed = Math.sqrt(player.velocity.x ** 2 + player.velocity.y ** 2)

    // If speed exceeds SPEED, normalize and scale the velocity
    if (currentSpeed > SPEED) {
      const scale = SPEED / currentSpeed
      player.velocity.x *= scale
      player.velocity.y *= scale
    }
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
    case 'Space': {
      let projectile = projectiles.find(p => !p.active)
      if (!projectile) {
        projectile = new Projectile({
          position: {
            x: player.position.x + Math.cos(player.rotation) * 20,
            y: player.position.y + Math.sin(player.rotation) * 20
          },
          velocity: {
            x: Math.cos(player.rotation) * PROJECTILE_SPEED,
            y: Math.sin(player.rotation) * PROJECTILE_SPEED
          }
        })
        projectiles.push(projectile)
      } else {
        projectile.position = {
          x: player.position.x + Math.cos(player.rotation) * 20,
          y: player.position.y + Math.sin(player.rotation) * 20
        }
        projectile.velocity = {
          x: Math.cos(player.rotation) * PROJECTILE_SPEED,
          y: Math.sin(player.rotation) * PROJECTILE_SPEED
        }
      }
      projectile.active = true
      break
    }
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
