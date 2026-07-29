import { useEffect, useMemo, useRef, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../lib/AuthContext'
import { buildTagEdges } from '../lib/tagGraph'
import AppShell from '../components/AppShell'

const CATEGORY_COLORS = {
  Projects: '#D4A24C',
  Skills: '#5FC3B0',
  Certifications: '#E6BE72',
  Internships: '#3FA796',
  Achievements: '#D4A24C',
  Academics: '#5FC3B0'
}

const CATEGORY_ICONS = {
  Projects: '🚀',
  Skills: '⚡',
  Certifications: '📜',
  Internships: '💼',
  Achievements: '🏆',
  Academics: '🎓'
}

export default function Connections() {
  const { user } = useAuth()
  const [documents, setDocuments] = useState([])
  const [categories, setCategories] = useState([])
  const [loading, setLoading] = useState(true)
  const [selectedId, setSelectedId] = useState(null)
  const [nodePositions, setNodePositions] = useState({})

  // Dragging state ref
  const draggingRef = useRef(null)
  const svgRef = useRef(null)

  useEffect(() => {
    if (!user) return
    let cancelled = false
    async function load() {
      setLoading(true)
      const [{ data: docs }, { data: cats }] = await Promise.all([
        supabase.from('documents').select('*').eq('user_id', user.id),
        supabase.from('categories').select('*'),
      ])
      if (cancelled) return
      setDocuments(docs || [])
      setCategories(cats || [])
      setLoading(false)
    }
    load()
    return () => { cancelled = true }
  }, [user])

  const categoryMap = useMemo(() => {
    const map = {}
    categories.forEach((c) => (map[c.id] = c.name))
    return map
  }, [categories])

  // Build raw edges from tagGraph logic (UNTOUCHED)
  const rawEdges = useMemo(() => {
    return buildTagEdges(documents)
  }, [documents])

  // Force simulation logic
  useEffect(() => {
    if (documents.length === 0) return

    const cx = 480
    const cy = 380

    // Initialize node physics data
    const nodes = documents.map((doc, i) => {
      const prev = nodePositions[doc.id]
      const angle = (i / Math.max(documents.length, 1)) * 2 * Math.PI
      const initR = 180 + (i % 3) * 40
      return {
        id: doc.id,
        x: prev ? prev.x : cx + initR * Math.cos(angle) + (Math.random() - 0.5) * 20,
        y: prev ? prev.y : cy + initR * Math.sin(angle) + (Math.random() - 0.5) * 20,
        vx: 0,
        vy: 0,
      }
    })

    const nodeMap = {}
    nodes.forEach((n) => { nodeMap[n.id] = n })

    // Force simulation physics calculation function
    function stepSimulation(ticks = 1, damping = 0.82) {
      for (let t = 0; t < ticks; t++) {
        // 1. Link Force (attraction based on shared tag count)
        rawEdges.forEach((e) => {
          const source = nodeMap[e.sourceId]
          const target = nodeMap[e.targetId]
          if (!source || !target) return

          const dx = target.x - source.x
          const dy = target.y - source.y
          const dist = Math.hypot(dx, dy) || 1

          const sharedCount = e.sharedTags?.length || 1
          // Multiple shared tags -> tighter target distance & stronger attraction
          const targetDist = Math.max(90, 240 - (sharedCount - 1) * 50)
          const strength = 0.06 + (sharedCount - 1) * 0.06

          const delta = (dist - targetDist) * strength
          const fx = (dx / dist) * delta
          const fy = (dy / dist) * delta

          source.vx += fx
          source.vy += fy
          target.vx -= fx
          target.vy -= fy
        })

        // 2. Many-Body Repulsion (all nodes repel each other)
        for (let i = 0; i < nodes.length; i++) {
          for (let j = i + 1; j < nodes.length; j++) {
            const a = nodes[i]
            const b = nodes[j]
            const dx = b.x - a.x
            const dy = b.y - a.y
            const distSq = dx * dx + dy * dy || 1
            const dist = Math.sqrt(distSq)

            // Repulsion strength
            const repulsion = -28000 / (distSq + 500)
            const fx = (dx / dist) * repulsion
            const fy = (dy / dist) * repulsion

            a.vx += fx
            a.vy += fy
            b.vx -= fx
            b.vy -= fy

            // 3. Collision Prevention (card rectangle separation)
            const overlapX = 180 - Math.abs(dx)
            const overlapY = 65 - Math.abs(dy)
            if (overlapX > 0 && overlapY > 0) {
              if (overlapX < overlapY) {
                const pushX = (overlapX / 2) * (dx > 0 ? -1 : 1)
                a.vx += pushX * 0.2
                b.vx -= pushX * 0.2
              } else {
                const pushY = (overlapY / 2) * (dy > 0 ? -1 : 1)
                a.vy += pushY * 0.2
                b.vy -= pushY * 0.2
              }
            }
          }
        }

        // 4. Centering Force
        nodes.forEach((n) => {
          n.vx += (cx - n.x) * 0.008
          n.vy += (cy - n.y) * 0.008
        })

        // 5. Apply velocity & position updates
        nodes.forEach((n) => {
          n.vx *= damping
          n.vy *= damping
          n.x += n.vx
          n.y += n.vy

          // Keep within viewBox bounds
          n.x = Math.max(100, Math.min(860, n.x))
          n.y = Math.max(50, Math.min(710, n.y))
        })
      }
    }

    // Run 300 ticks synchronously to settle initial layout
    stepSimulation(300, 0.8)

    const nextPos = {}
    nodes.forEach((n) => {
      nextPos[n.id] = { x: n.x, y: n.y }
    })
    setNodePositions(nextPos)
  }, [documents, rawEdges])

  // Map nodes with calculated positions
  const nodes = useMemo(() => {
    return documents.map((doc) => {
      const pos = nodePositions[doc.id] || { x: 480, y: 380 }
      return { ...doc, x: pos.x, y: pos.y }
    })
  }, [documents, nodePositions])

  const nodeById = useMemo(() => {
    const map = {}
    nodes.forEach((n) => (map[n.id] = n))
    return map
  }, [nodes])

  // Attach node objects to edges
  const edges = useMemo(() => {
    return rawEdges.map((e) => ({
      ...e,
      from: nodeById[e.sourceId],
      to: nodeById[e.targetId],
    })).filter((e) => e.from && e.to)
  }, [rawEdges, nodeById])

  const connectedIds = new Set(edges.flatMap((e) => [e.sourceId, e.targetId]))
  const selectedEdges = selectedId
    ? edges.filter((e) => e.sourceId === selectedId || e.targetId === selectedId)
    : []
  const selectedNode = selectedId ? nodeById[selectedId] : null

  // Interactive Node Dragging Handlers
  const handleMouseDown = (nodeId, e) => {
    e.stopPropagation()
    const svg = svgRef.current
    if (!svg) return
    const rect = svg.getBoundingClientRect()
    const scaleX = 960 / rect.width
    const scaleY = 780 / rect.height

    draggingRef.current = {
      id: nodeId,
      startX: e.clientX,
      startY: e.clientY,
      nodeStartX: nodePositions[nodeId]?.x || 480,
      nodeStartY: nodePositions[nodeId]?.y || 380,
      scaleX,
      scaleY,
    }

    window.addEventListener('mousemove', handleMouseMove)
    window.addEventListener('mouseup', handleMouseUp)
  }

  const handleMouseMove = (e) => {
    if (!draggingRef.current) return
    const { id, startX, startY, nodeStartX, nodeStartY, scaleX, scaleY } = draggingRef.current
    const dx = (e.clientX - startX) * scaleX
    const dy = (e.clientY - startY) * scaleY

    const newX = Math.max(90, Math.min(870, nodeStartX + dx))
    const newY = Math.max(45, Math.min(735, nodeStartY + dy))

    setNodePositions((prev) => ({
      ...prev,
      [id]: { x: newX, y: newY },
    }))
  }

  const handleMouseUp = () => {
    if (draggingRef.current) {
      draggingRef.current = null
    }
    window.removeEventListener('mousemove', handleMouseMove)
    window.removeEventListener('mouseup', handleMouseUp)
  }

  return (
    <AppShell>
      <div className="max-w-7xl mx-auto px-6 sm:px-10 py-10">
        <h1 className="font-display text-4xl mb-2" style={{ color: '#1E2340' }}>Connections</h1>
        <p className="mb-2 text-lg" style={{ color: 'rgba(30,35,64,0.7)' }}>
          How your certifications, skills, projects, and internships link together.
        </p>
        <p className="text-sm mb-8" style={{ color: 'rgba(30,35,64,0.55)' }}>
          {edges.length} connection{edges.length !== 1 ? 's' : ''} found across {documents.length} document{documents.length !== 1 ? 's' : ''}.
          Tap any card to inspect its connected graph, or drag nodes to adjust.
        </p>

        {loading ? (
          <p style={{ color: 'rgba(30,35,64,0.5)' }}>Mapping your archive…</p>
        ) : documents.length === 0 ? (
          <div className="border border-dashed border-parchment-100/20 rounded-3xl py-24 text-center glass-panel">
            <p className="font-display text-2xl mb-2" style={{ color: '#1E2340' }}>Nothing to connect yet</p>
            <p style={{ color: 'rgba(30,35,64,0.6)' }}>Upload a few documents and MemoryVerse will start mapping how they relate.</p>
          </div>
        ) : (
          <>
            <div className="flex flex-wrap items-center gap-x-5 gap-y-2 mb-4">
              {Object.entries(CATEGORY_COLORS).map(([name, color]) => (
                <div key={name} className="flex items-center gap-1.5 text-xs" style={{ color: '#1E2340', fontWeight: 500 }}>
                  <span className="w-2.5 h-2.5 rounded-full" style={{ background: color }} />
                  {name}
                </div>
              ))}
            </div>

            <div className="relative glass-panel rounded-3xl overflow-hidden shadow-xl">
              <svg
                ref={svgRef}
                viewBox="0 0 960 780"
                className="w-full h-[640px] sm:h-[760px] select-none"
                onClick={() => setSelectedId(null)}
              >
                <defs>
                  {/* Category color glowing drop-shadow filters */}
                  {Object.entries(CATEGORY_COLORS).map(([catName, hexColor]) => (
                    <filter key={catName} id={`glow-${catName}`} x="-30%" y="-30%" width="160%" height="160%">
                      <feDropShadow dx="0" dy="4" stdDeviation="6" floodColor={hexColor} floodOpacity="0.45" />
                    </filter>
                  ))}
                  <filter id="glow-default" x="-30%" y="-30%" width="160%" height="160%">
                    <feDropShadow dx="0" dy="4" stdDeviation="6" floodColor="#D4A24C" floodOpacity="0.45" />
                  </filter>
                </defs>

                {/* Curved Bezier SVG Edges */}
                {edges.map((e, i) => {
                  const involvesSelected = selectedId && (e.sourceId === selectedId || e.targetId === selectedId)
                  const dimmed = selectedId && !involvesSelected

                  const x1 = e.from.x
                  const y1 = e.from.y
                  const x2 = e.to.x
                  const y2 = e.to.y

                  const dx = x2 - x1
                  const dy = y2 - y1
                  const dist = Math.hypot(dx, dy) || 1

                  // Perpendicular control point offset for smooth curve
                  const nx = -dy / dist
                  const ny = dx / dist
                  const curveOffset = Math.min(45, Math.max(20, dist * 0.18)) * (i % 2 === 0 ? 1 : -1)

                  const cx = (x1 + x2) / 2 + nx * curveOffset
                  const cy = (y1 + y2) / 2 + ny * curveOffset

                  // Curve midpoint for tag label
                  const labelX = 0.25 * x1 + 0.5 * cx + 0.25 * x2
                  const labelY = 0.25 * y1 + 0.5 * cy + 0.25 * y2

                  const pathD = `M ${x1} ${y1} Q ${cx} ${cy} ${x2} ${y2}`

                  return (
                    <g key={i}>
                      <path
                        d={pathD}
                        fill="none"
                        stroke={involvesSelected ? '#7C8CFF' : '#3FA796'}
                        strokeWidth={involvesSelected ? 3.5 : Math.min(4, 1.8 + (e.sharedTags?.length || 1) * 0.6)}
                        strokeDasharray={involvesSelected ? '6 4' : 'none'}
                        className={involvesSelected ? 'moving-dotted-line' : ''}
                        opacity={dimmed ? 0.1 : involvesSelected ? 1 : 0.65}
                      />
                      {!dimmed && (
                        <g transform={`translate(${labelX}, ${labelY})`}>
                          <rect
                            x="-40"
                            y="-11"
                            width="80"
                            height="18"
                            rx="9"
                            fill="rgba(255, 255, 255, 0.88)"
                            stroke={involvesSelected ? '#7C8CFF' : 'rgba(63,167,150,0.4)'}
                            strokeWidth="1"
                          />
                          <text
                            x="0"
                            y="2"
                            textAnchor="middle"
                            fontSize="10"
                            fontWeight="600"
                            fill={involvesSelected ? '#1E2340' : '#2E8577'}
                          >
                            {e.label.length > 18 ? e.label.slice(0, 16) + '…' : e.label}
                          </text>
                        </g>
                      )}
                    </g>
                  )
                })}

                {/* Card-Style Nodes */}
                {nodes.map((n) => {
                  const catName = categoryMap[n.category_id] || 'Projects'
                  const color = CATEGORY_COLORS[catName] || '#D4A24C'
                  const icon = CATEGORY_ICONS[catName] || '📑'
                  const isConnected = connectedIds.has(n.id)
                  const isSelected = n.id === selectedId
                  const dimmed = selectedId && !isSelected && !selectedEdges.some((e) => e.sourceId === n.id || e.targetId === n.id)

                  const cardW = 160
                  const cardH = 46

                  return (
                    <g
                      key={n.id}
                      transform={`translate(${n.x}, ${n.y})`}
                      onClick={(e) => {
                        e.stopPropagation()
                        setSelectedId(n.id === selectedId ? null : n.id)
                      }}
                      onMouseDown={(e) => handleMouseDown(n.id, e)}
                      style={{ cursor: 'grab' }}
                      opacity={dimmed ? 0.2 : 1}
                      className="transition-opacity duration-200"
                    >
                      {/* Card Base with Glowing Category Border */}
                      <rect
                        x={-cardW / 2}
                        y={-cardH / 2}
                        width={cardW}
                        height={cardH}
                        rx="14"
                        ry="14"
                        fill={isSelected ? '#1A1D36' : 'rgba(26, 29, 54, 0.88)'}
                        stroke={color}
                        strokeWidth={isSelected ? 2.5 : 1.5}
                        filter={`url(#glow-${catName})`}
                      />

                      {/* Left Icon Circle Badge */}
                      <circle
                        cx={-cardW / 2 + 20}
                        cy="0"
                        r="12"
                        fill={`${color}25`}
                        stroke={color}
                        strokeWidth="1"
                      />
                      <text
                        x={-cardW / 2 + 20}
                        y="4"
                        textAnchor="middle"
                        fontSize="11"
                      >
                        {icon}
                      </text>

                      {/* Truncated Document Title Label */}
                      <text
                        x={-cardW / 2 + 38}
                        y="4"
                        textAnchor="start"
                        fontSize="12"
                        fontWeight={isSelected ? '700' : '500'}
                        fill="#FFFFFF"
                      >
                        {n.title.length > 15 ? n.title.slice(0, 14) + '…' : n.title}
                      </text>

                      {/* Selected Pulse Ring indicator */}
                      {isSelected && (
                        <rect
                          x={-cardW / 2 - 4}
                          y={-cardH / 2 - 4}
                          width={cardW + 8}
                          height={cardH + 8}
                          rx="18"
                          ry="18"
                          fill="none"
                          stroke={color}
                          strokeWidth="1.5"
                          opacity="0.8"
                          strokeDasharray="4 3"
                        />
                      )}
                    </g>
                  )
                })}
              </svg>
            </div>
          </>
        )}
      </div>

      {/* Pop-up modal overlay when a node is selected (UNTOUCHED) */}
      {selectedNode && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Blurred backdrop scrim */}
          <div
            className="absolute inset-0 transition-opacity"
            style={{
              background: 'rgba(20, 22, 40, 0.45)',
              backdropFilter: 'blur(12px)',
              WebkitBackdropFilter: 'blur(12px)',
            }}
            onClick={() => setSelectedId(null)}
          />

          {/* Centered 3D Pop-out card */}
          <div
            className="relative w-full max-w-lg glass-panel rounded-3xl p-6 sm:p-8 animate-pop-in z-10 shadow-2xl"
            style={{
              background: 'linear-gradient(145deg, rgba(255,255,255,0.85) 0%, rgba(255,255,255,0.7) 100%)',
              backdropFilter: 'blur(40px) saturate(200%)',
              WebkitBackdropFilter: 'blur(40px) saturate(200%)',
              border: '1px solid rgba(255,255,255,0.8)',
              boxShadow: '0 30px 60px -15px rgba(20,22,40,0.5), 0 0 0 1px rgba(255,255,255,0.6) inset',
            }}
          >
            {/* Close button */}
            <button
              onClick={() => setSelectedId(null)}
              className="absolute top-5 right-5 w-8 h-8 rounded-full flex items-center justify-center text-lg font-bold transition-all"
              style={{
                background: 'rgba(30,35,64,0.08)',
                color: '#1E2340',
                border: '1px solid rgba(30,35,64,0.12)',
              }}
              onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(30,35,64,0.16)' }}
              onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(30,35,64,0.08)' }}
            >
              ×
            </button>

            {/* Category tag */}
            <div className="flex items-center gap-2 mb-3">
              <span
                className="w-3 h-3 rounded-full flex-shrink-0"
                style={{ background: CATEGORY_COLORS[categoryMap[selectedNode.category_id]] || '#D4A24C' }}
              />
              <span className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'rgba(30,35,64,0.65)' }}>
                {categoryMap[selectedNode.category_id] || 'Uncategorized'}
              </span>
            </div>

            {/* Node Title */}
            <h3 className="font-display text-2xl font-bold mb-3" style={{ color: '#1E2340', lineHeight: '1.25' }}>
              {selectedNode.title}
            </h3>

            {/* AI Summary */}
            {selectedNode.ai_summary && (
              <p className="text-sm leading-relaxed mb-5" style={{ color: 'rgba(30,35,64,0.75)' }}>
                {selectedNode.ai_summary}
              </p>
            )}

            {/* Tags on selected node */}
            {selectedNode.tags?.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mb-4">
                {selectedNode.tags.map((tag) => (
                  <span
                    key={tag}
                    className="text-[11px] px-2 py-0.5 rounded-full font-medium"
                    style={{ background: 'rgba(63,167,150,0.12)', color: '#3FA796' }}
                  >
                    {tag}
                  </span>
                ))}
              </div>
            )}

            {/* Connections breakdown */}
            <div className="mt-4 pt-4 border-t" style={{ borderColor: 'rgba(30,35,64,0.1)' }}>
              <p className="text-xs font-semibold uppercase tracking-wider mb-3" style={{ color: 'rgba(30,35,64,0.55)' }}>
                Connected Documents ({selectedEdges.length})
              </p>

              {selectedEdges.length === 0 ? (
                <p className="text-sm" style={{ color: 'rgba(30,35,64,0.5)' }}>No direct connections found yet — nothing shares a tag or reads as similar enough to this document.</p>
              ) : (
                <div className="space-y-2.5 max-h-48 overflow-y-auto pr-1">
                  {selectedEdges.map((e, i) => {
                    const other = e.sourceId === selectedId ? e.to : e.from
                    const otherCat = categoryMap[other.category_id]
                    return (
                      <div
                        key={i}
                        className="p-3 rounded-xl transition-all cursor-pointer"
                        style={{ background: 'rgba(255,255,255,0.6)', border: '1px solid rgba(30,35,64,0.08)' }}
                        onClick={() => setSelectedId(other.id)}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-sm font-semibold truncate" style={{ color: '#1E2340' }}>
                            ↔ {other.title}
                          </span>
                          <span className="text-[11px] px-2 py-0.5 rounded-md font-medium" style={{ background: 'rgba(124,140,255,0.15)', color: '#1E2340' }}>
                            {otherCat || 'Link'}
                          </span>
                        </div>
                        <span className="block text-xs mt-1" style={{ color: 'rgba(30,35,64,0.6)' }}>
                          {e.label}
                        </span>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>

            {/* Document view link */}
            {selectedNode.file_url && (
              <a
                href={selectedNode.file_url}
                target="_blank"
                rel="noreferrer"
                className="mt-6 w-full flex items-center justify-center gap-2 py-2.5 rounded-xl font-semibold text-sm transition-all"
                style={{
                  background: 'linear-gradient(135deg, rgba(124,140,255,0.3), rgba(192,132,245,0.25))',
                  color: '#1E2340',
                  border: '1px solid rgba(124,140,255,0.4)',
                }}
              >
                View original document ↗
              </a>
            )}
          </div>
        </div>
      )}
    </AppShell>
  )
}