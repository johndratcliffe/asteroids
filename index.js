const canvas = document.querySelector('canvas')
const ctx = canvas.getContext('2d')

canvas.width = window.innerWidth
canvas.height = window.innerHeight

const SPEED = 3
const ROTATIONAL_SPEED = 3
const FRICTION = 0.99

const keys = {
  w: {
    pressed: false
  },
  a: {
    pressed: false
  },
  d: {
    pressed: false
  }
}

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

    ctx.translate(this.position.x, this.position.y)
    ctx.rotate(this.rotation)
    ctx.translate(-this.position.x, -this.position.y)

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

const player = new Player({
  position: { x: canvas.width / 2, y: canvas.height / 2 },
  velocity: { x: 0, y: 0 }
})

function animate () {
  window.requestAnimationFrame(animate)
  player.update()
  if (keys.w.pressed) {
    player.velocity.x = Math.cos(player.rotation) * SPEED
    player.velocity.y = Math.sin(player.rotation) * SPEED
  } else if (!keys.w.pressed) {
    player.velocity.x *= FRICTION
    player.velocity.y *= FRICTION
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
