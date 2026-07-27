local adapterPath = assert(arg[1], "pass the Hammerspoon adapter path")
local postedEvents = {}
local frontmostBundleID = "com.google.Chrome"
local eventCallback

local eventTypes = {
  keyDown = 10,
  keyUp = 11,
  flagsChanged = 12,
}

local eventProperties = {
  eventSourceUserData = 42,
}

hs = {
  application = {
    frontmostApplication = function()
      return {
        bundleID = function()
          return frontmostBundleID
        end,
      }
    end,
  },
  keycodes = {
    map = {
      c = 8,
      tab = 48,
    },
  },
  eventtap = {
    event = {
      types = eventTypes,
      properties = eventProperties,
      newKeyEvent = function(modifiers, key, isDown)
        local syntheticEvent = {
          modifiers = modifiers,
          key = key,
          isDown = isDown,
        }

        function syntheticEvent:setProperty(property, value)
          self[property] = value
          return self
        end

        function syntheticEvent:post()
          table.insert(postedEvents, self)
          return self
        end

        return syntheticEvent
      end,
    },
    new = function(_, callback)
      eventCallback = callback
      return {
        start = function(self)
          return self
        end,
      }
    end,
  },
}

local function keyboardEvent(eventType, keyCode, flags, sourceMarker)
  return {
    getType = function()
      return eventType
    end,
    getKeyCode = function()
      return keyCode
    end,
    getFlags = function()
      return flags or {}
    end,
    getProperty = function(_, property)
      if property == eventProperties.eventSourceUserData then
        return sourceMarker or 0
      end
      return 0
    end,
  }
end

dofile(adapterPath)
assert(eventCallback, "adapter did not create an event tap")

assert(eventCallback(keyboardEvent(eventTypes.keyDown, 48, {
  ctrl = true,
  shift = true,
})) == true)
assert(#postedEvents == 2 and postedEvents[1].key == "u")
assert(eventCallback(keyboardEvent(eventTypes.keyUp, 48, {
  ctrl = true,
  shift = true,
})) == true)
assert(eventCallback(keyboardEvent(eventTypes.flagsChanged, 0, {})) == false)
assert(#postedEvents == 4 and postedEvents[3].key == ",")

postedEvents = {}
assert(eventCallback(keyboardEvent(eventTypes.keyDown, 48, { ctrl = true })) == true)
assert(#postedEvents == 2 and postedEvents[1].key == ".")
assert(eventCallback(keyboardEvent(eventTypes.keyUp, 48, { ctrl = true })) == true)

assert(eventCallback(keyboardEvent(eventTypes.flagsChanged, 0, {})) == false)
assert(#postedEvents == 4 and postedEvents[3].key == ",")

assert(eventCallback(keyboardEvent(eventTypes.keyDown, 8, {
  cmd = true,
  shift = true,
})) == true)
assert(#postedEvents == 6 and postedEvents[5].key == "x")

assert(eventCallback(keyboardEvent(eventTypes.keyDown, 8, {
  alt = true,
  cmd = true,
})) == true)
assert(#postedEvents == 8 and postedEvents[7].key == "c")

local sourceMarker = postedEvents[1][eventProperties.eventSourceUserData]
assert(sourceMarker ~= nil)
assert(eventCallback(keyboardEvent(eventTypes.keyDown, 8, {
  cmd = true,
  shift = true,
}, sourceMarker)) == false)
assert(#postedEvents == 8, "synthetic commands must not be remapped recursively")

frontmostBundleID = "com.apple.Safari"
assert(eventCallback(keyboardEvent(eventTypes.keyDown, 48, { ctrl = true })) == false)

print("Hammerspoon adapter tests passed")
