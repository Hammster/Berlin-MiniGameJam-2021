const RayLib = require('raylib')
const path = require('path')
const { getHeapSpaceStatistics } = require('v8')
const { dirname } = require('path')
const { Ray } = require('raylib')

// DEFINTIONS ----------------------------------------------------------------------

class Entity {
  constructor(config = {}) {
    const {x, y, z, w, h, sprite, onUpdate, onCollide, noScale} = config
    this.x = x ?? 0
    this.y = y ?? 0
    this.z = z ?? 0
    this.w = w ?? 1
    this.h = h ?? 1
    this.sprite = sprite || 'placeholder.png'
    this.textureRef = null
    this.hasCollided = false
    this.noScale = noScale || false,
    
    this.onUpdate = onUpdate.bind(this) || void(0)
    this.onCollide = onCollide.bind(this) || void(0)
    this.timestampCreated = RayLib.GetTime()

    this.load()
    entities.push(this)
  }

  get scale() {
      return this.calcScale()
  }

  get position() {
    const projectedTransform = this.calcProjection()
    return { x: this.x, y: this.y, z: this.y }
  }

  get size() {
    const projectedTransform = this.calcProjection()
    return { w: this.w , h: this.h }
  }

  get lifeTime() {
    return RayLib.GetTime() - this.timestampCreated
  }

  load() {
    this.textureRef = assetTable[this.sprite]
    
    if(this.textureRef === undefined) {
      this.textureRef = assetTable[this.sprite] = RayLib.LoadTexture(getAssetPath(this.sprite))
    }
  }

  calcScale() {
    const from = scaleScale.find(val => this.z >= val)
    const to = scaleScale(scaleScale.indexOf(from) + 1)
  }

  calcProjection() {
    
  }

  checkCollision() {

  }

  render() {
    const scale = this.noScale ? 1 : 0.1 * this.z

    const pos = {
      x: (this.x - this.textureRef.width / 2) * scale + screenCenter.x,
      y: (this.y - this.textureRef.height / 2) * scale + screenCenter.y
    }

    RayLib.DrawTextureEx(this.textureRef, pos, 0, scale, RayLib.WHITE)
    // RayLib.DrawCircle(pos.x + (this.textureRef.width / 2) * scale, pos.y + (this.textureRef.height / 2) * scale, 5.0, RayLib.RED)
  }
}

class HUD {}

// STATIC -------------------------------------------------------------------------

const scaleScale = [0.01, 1, 2, 3]
const screenWidth = 640
const screenHeight = 480
const screenCenter = { x: screenWidth / 2, y: screenHeight / 2 }
const GAME_STATES = {
  PLAYING: 0,
  PAUSED: 1,
  GAMEOVER: 2,
  CLOSE_GAME: 3,
  RESTART_GAME: 4
}

const soundTable = {}
const assetTable = {}

// STATES -------------------------------------------------------------------------

let points = 0
let lives = 3
let entities = []
let gameState = GAME_STATES.PLAYING

// FUNCTIONS ----------------------------------------------------------------------

function getAssetPath(filePath) {
  return path.join(__dirname, 'assets', filePath)
}

// LOOP ---------------------------------------------------------------------------

RayLib.InitWindow(screenWidth, screenHeight, "Spaghetti Shooter")
RayLib.SetTargetFPS(60)
RayLib.InitAudioDevice()

// URGHHH?! Sound
const timWave = RayLib.LoadWave(getAssetPath('placeholder.wav'))
soundTable.tim = RayLib.LoadSoundFromWave(timWave)
RayLib.PlaySound(soundTable.tim)

new Entity({
  x: 0,
  y: 150,
  z: 7,
  noScale: true,
  sprite: 'player.png',
  
  onUpdate (e, dt) {
    if(RayLib.IsKeyDown(RayLib.KEY_RIGHT)) {
      this.x += 200 * dt
    }
    if(RayLib.IsKeyDown(RayLib.KEY_LEFT)) {
      this.x -= 200 * dt
    }
    if(RayLib.IsKeyDown(RayLib.KEY_UP)) {
      this.y -= 200 * dt
    }
    if(RayLib.IsKeyDown(RayLib.KEY_DOWN)) {
      this.y += 200 * dt
    }
  },

  onCollide (collider) {
    if(!collider.hasCollided && Math.abs(collider.x - this.x) < this.textureRef.width && Math.abs(collider.y - this.y) < this.textureRef.height) {   
      collider.hasCollided = true
      if(lives <= 1) {
        lives--
        gameState = GAME_STATES.GAMEOVER
      } else {
        lives--
      }
    }
  }
})

const allenFactory = () => {
  new Entity({
    x: RayLib.GetRandomValue(-screenCenter.x, screenCenter.x),
    y: RayLib.GetRandomValue(-screenCenter.y, screenCenter.y),
    onUpdate (x) {
      this.z = Math.abs(Math.sin(this.lifeTime/4)) * 15
      if(this.hasCollided || this.z > 14.997) {
        RayLib.PlaySound(soundTable.tim)
        entities.splice(entities.indexOf(this), 1);
      }
    },
    onCollide (collider) {
      // console.log('colide')
    }
  })
}

while (gameState !== GAME_STATES.CLOSE_GAME) {
    if(RayLib.WindowShouldClose()) {
      gameState = GAME_STATES.CLOSE_GAME
      continue
    }

    const gameTime = RayLib.GetTime()
    const frameTime = RayLib.GetFrameTime()

    // Clear
    RayLib.BeginDrawing()
    RayLib.ClearBackground(RayLib.BLACK)

    switch(gameState) {

      case GAME_STATES.PLAYING:
        // Randomize
        RayLib.GetRandomValue(0, 160) === 160 ? allenFactory() : void(0)

        // Z ordering
        entities = entities.sort((a, b) => { return a.z - b.z })

        let lastEntity = null
        
        // Iteration
        for (let entityIndex = 0; entityIndex < entities.length; entityIndex++) {
          const entity = entities[entityIndex];
          entity.onUpdate(gameTime, frameTime)

          if(lastEntity && (Math.abs(lastEntity.z) - 7) < 0.1 ) {
            lastEntity.onCollide(entity)
          }
          
          entity.render()
          lastEntity = entity
        }

        RayLib.DrawText("Lives: " + lives, 0, 0, 20, RayLib.LIGHTGRAY)
        break;
      
      case GAME_STATES.GAMEOVER:
        RayLib.DrawText(`Game Over (${points})`, 0, 0, 20, RayLib.LIGHTGRAY)
        RayLib.DrawText('Press SPACE to restart, Press ESC to exit', 0, 25, 20, RayLib.LIGHTGRAY)
        
        if(RayLib.IsKeyDown(RayLib.KEY_SPACE)) {
          points = 0
          lives = 3
          entities = entities.filter(x => x.sprite === 'player.png')
          gameState = GAME_STATES.PLAYING
        }

        if(RayLib.IsKeyDown(RayLib.KEY_ESCAPE)) {
          gameState = GAME_STATES.CLOSE_GAME
        }
        break;
    }


    RayLib.EndDrawing()
}

entities.forEach(y => RayLib.UnloadTexture(y.textureRef))
Object.values(soundTable).forEach(y => RayLib.UnloadSound(y))

RayLib.CloseWindow()