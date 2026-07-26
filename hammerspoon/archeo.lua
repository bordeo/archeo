-- Archeo shortcuts for Hammerspoon.
-- Enable this adapter or the Karabiner-Elements rule, never both.

local chromeBundleIDs = {
  ["com.google.Chrome"] = true,
  ["com.google.Chrome.beta"] = true,
  ["com.google.Chrome.dev"] = true,
  ["com.google.Chrome.canary"] = true,
  ["org.chromium.Chromium"] = true,
}

local eventTypes = hs.eventtap.event.types
local eventProperties = hs.eventtap.event.properties
local keyCodes = hs.keycodes.map
local switching = false
local archeoEventMarker = 0x41524348

local function chromeIsFrontmost()
  local application = hs.application.frontmostApplication()
  return application ~= nil and chromeBundleIDs[application:bundleID()] == true
end

-- Post only the shortcut key events with the desired flags. This avoids
-- synthesizing modifier transitions that could look like a Control release.
local function sendShortcut(modifiers, key)
  hs.eventtap.event.newKeyEvent(modifiers, key, true)
    :setProperty(eventProperties.eventSourceUserData, archeoEventMarker)
    :post()
  hs.eventtap.event.newKeyEvent(modifiers, key, false)
    :setProperty(eventProperties.eventSourceUserData, archeoEventMarker)
    :post()
end

local function hasOnly(flags, required)
  for _, modifier in ipairs({ "cmd", "ctrl", "alt", "shift" }) do
    if (flags[modifier] == true) ~= (required[modifier] == true) then
      return false
    end
  end
  return true
end

local archeoEventTap = hs.eventtap.new({
  eventTypes.keyDown,
  eventTypes.keyUp,
  eventTypes.flagsChanged,
}, function(event)
  if event:getProperty(eventProperties.eventSourceUserData) == archeoEventMarker then
    return false
  end

  local eventType = event:getType()

  if eventType == eventTypes.flagsChanged then
    if switching and not event:getFlags().ctrl then
      switching = false
      if chromeIsFrontmost() then
        sendShortcut({ "ctrl", "shift" }, ",")
      end
    end
    return false
  end

  local keyCode = event:getKeyCode()
  local flags = event:getFlags()

  if eventType == eventTypes.keyUp then
    return switching and keyCode == keyCodes.tab
  end

  if not chromeIsFrontmost() then
    return false
  end

  if keyCode == keyCodes.tab and hasOnly(flags, { ctrl = true }) then
    switching = true
    sendShortcut({ "ctrl", "shift" }, ".")
    return true
  end

  if keyCode == keyCodes.c and hasOnly(flags, { cmd = true, shift = true }) then
    sendShortcut({ "cmd", "shift" }, "x")
    return true
  end

  if keyCode == keyCodes.c and hasOnly(flags, { cmd = true, alt = true }) then
    sendShortcut({ "cmd", "shift" }, "c")
    return true
  end

  return false
end)

archeoEventTap:start()

return archeoEventTap
