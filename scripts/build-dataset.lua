-- Generates data/love-api.json from the love2d-community/love-api source.
--
-- Usage:  lua scripts/build-dataset.lua <path-to-love-api-clone> > data/love-api.json
--
-- The love-api project describes the full LOVE API as Lua tables. This script
-- requires it, walks the root functions/callbacks and every module's functions
-- and enums, and emits our flat ApiEntry[] JSON shape (path, name, kind,
-- signature, params, returns, description, url). Object types and their methods
-- are intentionally skipped: they are not accessed as dotted love.* symbols, so
-- autocomplete, hover, and the linter do not need them.

local cloneDir = arg[1]
if not cloneDir then
  io.stderr:write("usage: lua build-dataset.lua <love-api-clone-dir>\n")
  os.exit(1)
end
package.path = cloneDir .. "/?.lua;" .. package.path

local api = require("love_api")

local WIKI = "https://love2d.org/wiki/"
local entries = {}

-- JSON string escaping for the subset of characters that appear in the data.
local function jsonString(s)
  s = s:gsub("\\", "\\\\"):gsub('"', '\\"')
  s = s:gsub("\n", "\\n"):gsub("\r", "\\r"):gsub("\t", "\\t")
  s = s:gsub("[%z\1-\8\11\12\14-\31]", function(c)
    return string.format("\\u%04x", string.byte(c))
  end)
  return '"' .. s .. '"'
end

local function firstVariant(fn)
  return fn.variants and fn.variants[1] or nil
end

-- Builds a "path(argA, argB)" signature from a function's first variant.
local function signatureFor(path, fn)
  local names = {}
  local v = firstVariant(fn)
  if v and v.arguments then
    for _, a in ipairs(v.arguments) do
      names[#names + 1] = a.name or "..."
    end
  end
  return path .. "(" .. table.concat(names, ", ") .. ")"
end

local function paramsFor(fn)
  local out = {}
  local v = firstVariant(fn)
  if v and v.arguments then
    for _, a in ipairs(v.arguments) do
      out[#out + 1] = { name = a.name, type = a.type, description = a.description }
    end
  end
  return out
end

local function returnsFor(fn)
  local out = {}
  local v = firstVariant(fn)
  if v and v.returns then
    for _, r in ipairs(v.returns) do
      out[#out + 1] = { name = r.name, type = r.type, description = r.description }
    end
  end
  return out
end

local function addFunction(path, name, kind, fn)
  entries[#entries + 1] = {
    path = path,
    name = name,
    kind = kind,
    signature = signatureFor(path, fn),
    params = paramsFor(fn),
    returns = returnsFor(fn),
    description = fn.description or "",
    url = WIKI .. path,
  }
end

local function addModuleLike(path, name, kind, description, url)
  entries[#entries + 1] = {
    path = path,
    name = name,
    kind = kind,
    description = description or "",
    url = url,
  }
end

-- Root namespace.
addModuleLike("love", "love", "module",
  "The root LOVE namespace. All modules, functions, and callbacks live under love.",
  WIKI .. "love")

-- Top-level love.* functions and callbacks.
for _, fn in ipairs(api.functions or {}) do
  addFunction("love." .. fn.name, fn.name, "function", fn)
end
for _, cb in ipairs(api.callbacks or {}) do
  addFunction("love." .. cb.name, cb.name, "callback", cb)
end

-- Each module, its functions, and its enums.
for _, mod in ipairs(api.modules or {}) do
  local modPath = "love." .. mod.name
  addModuleLike(modPath, mod.name, "module", mod.description, WIKI .. modPath)
  for _, fn in ipairs(mod.functions or {}) do
    addFunction(modPath .. "." .. fn.name, fn.name, "function", fn)
  end
  for _, en in ipairs(mod.enums or {}) do
    addModuleLike(modPath .. "." .. en.name, en.name, "enum", en.description, WIKI .. en.name)
  end
end

-- Stable ordering by path.
table.sort(entries, function(a, b) return a.path < b.path end)

-- Emit JSON.
local buf = { "[" }
local function field(k, v)
  return jsonString(k) .. ": " .. v
end
local function encodeArgArray(list)
  if #list == 0 then return "[]" end
  local parts = {}
  for _, item in ipairs(list) do
    local fields = { field("name", item.name and jsonString(item.name) or "null") }
    if item.type then fields[#fields + 1] = field("type", jsonString(item.type)) end
    if item.description then fields[#fields + 1] = field("description", jsonString(item.description)) end
    parts[#parts + 1] = "{ " .. table.concat(fields, ", ") .. " }"
  end
  return "[" .. table.concat(parts, ", ") .. "]"
end

for i, e in ipairs(entries) do
  local fields = {
    field("path", jsonString(e.path)),
    field("name", jsonString(e.name)),
    field("kind", jsonString(e.kind)),
  }
  if e.signature then fields[#fields + 1] = field("signature", jsonString(e.signature)) end
  if e.params then fields[#fields + 1] = field("params", encodeArgArray(e.params)) end
  if e.returns then fields[#fields + 1] = field("returns", encodeArgArray(e.returns)) end
  fields[#fields + 1] = field("description", jsonString(e.description))
  if e.url then fields[#fields + 1] = field("url", jsonString(e.url)) end
  buf[#buf + 1] = "  {\n    " .. table.concat(fields, ",\n    ") .. "\n  }" .. (i < #entries and "," or "")
end
buf[#buf + 1] = "]"
io.write(table.concat(buf, "\n"), "\n")
