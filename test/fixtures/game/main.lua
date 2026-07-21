local bar = require('foo.bar')
local player = require('player')

function love.load()
  greet()
  player.spawn()
end

local function greet()
  print("hello from greet")
end
