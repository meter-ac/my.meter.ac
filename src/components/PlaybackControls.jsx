function formatFrameTime(isoString) {
  return new Date(isoString).toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export default function PlaybackControls({
  frames,
  frameIndex,
  onFrameIndexChange,
  isPlaying,
  onTogglePlaying,
  isLoading,
  error,
}) {
  if (isLoading) return <div className="playback-controls__status">Loading 24h history…</div>;
  if (error) return <div className="playback-controls__status">Couldn't load history: {error}</div>;
  if (frames.length === 0) return null;

  const frame = frames[frameIndex];

  return (
    <div className="playback-controls">
      <div className="playback-controls__row">
        <button
          type="button"
          className="playback-controls__play"
          onClick={() => onTogglePlaying(!isPlaying)}
          aria-label={isPlaying ? 'Pause' : 'Play'}
        >
          {isPlaying ? '⏸' : '▶'}
        </button>
        <input
          type="range"
          className="playback-controls__scrubber"
          min={0}
          max={frames.length - 1}
          value={frameIndex}
          onChange={(e) => onFrameIndexChange(Number(e.target.value))}
        />
      </div>
      <div className="playback-controls__time">
        {formatFrameTime(frame.timestamp)} ({frameIndex + 1}/{frames.length})
      </div>
    </div>
  );
}
