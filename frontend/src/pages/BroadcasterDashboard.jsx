import { useState, useEffect, useRef } from 'react';
import { getTournaments, getTournamentFull, updateTournament } from '../api/client';
import { Tv, Play, Square, Download, AlertCircle, RefreshCw, Link as LinkIcon, Check } from 'lucide-react';

export default function BroadcasterDashboard() {
  const [tournaments, setTournaments] = useState([]);
  const [selectedTournament, setSelectedTournament] = useState('');
  const [tournamentData, setTournamentData] = useState(null);
  const tournamentDataRef = useRef(null);

  const [youtubeHandle, setYoutubeHandle] = useState(import.meta.env.VITE_YOUTUBE_HANDLE || '');
  const [savingHandle, setSavingHandle] = useState(false);
  const [handleSaved, setHandleSaved] = useState(false);

  useEffect(() => {
    tournamentDataRef.current = tournamentData;
  }, [tournamentData]);

  const [streamKey, setStreamKey] = useState(import.meta.env.VITE_YOUTUBE_STREAM_KEY || '');
  const [isRecording, setIsRecording] = useState(false);
  const [recordedBlobUrl, setRecordedBlobUrl] = useState(null);
  const [error, setError] = useState('');

  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const wsRef = useRef(null);
  const animationFrameRef = useRef(null);
  const streamRef = useRef(null);
  const recordedChunksRef = useRef([]);

  // Fetch score loop
  useEffect(() => {
    let interval;
    if (isRecording && selectedTournament) {
      interval = setInterval(() => {
        getTournamentFull(selectedTournament).then(data => {
          setTournamentData(data);
        }).catch(err => console.error("Failed to fetch scoreboard:", err));
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isRecording, selectedTournament]);

  useEffect(() => {
    getTournaments().then(setTournaments).catch(err => setError('Failed to load tournaments.'));
  }, []);

  const handleTournamentSelect = async (tid) => {
    setSelectedTournament(tid);
    if (tid) {
      const data = await getTournamentFull(tid).catch(() => null);
      setTournamentData(data);
      setYoutubeHandle(data?.tournament?.youtube_link || import.meta.env.VITE_YOUTUBE_HANDLE || '');
    } else {
      setTournamentData(null);
      setYoutubeHandle(import.meta.env.VITE_YOUTUBE_HANDLE || '');
    }
  };

  const handleSaveYoutubeLink = async () => {
    if (!selectedTournament) return;
    setSavingHandle(true);
    try {
      await updateTournament(selectedTournament, { youtube_link: youtubeHandle });
      setHandleSaved(true);
      setTimeout(() => setHandleSaved(false), 2000);
    } catch (err) {
      setError('Failed to save YouTube handle: ' + err.message);
    } finally {
      setSavingHandle(false);
    }
  };

  const getScoreboardData = () => {
    const currentData = tournamentDataRef.current;
    if (!currentData) return null;
    const { fixtures, teams, scorecards } = currentData;
    if (!fixtures || fixtures.length === 0) return null;

    const activeFixture = fixtures.find(f => f.status === 'in_progress');
    if (!activeFixture) return null;

    const team1 = teams.find(t => t.id === activeFixture.team1_id);
    const team2 = teams.find(t => t.id === activeFixture.team2_id);

    const matches = (scorecards || []).filter(s => s.fixture_id === activeFixture.id);
    // Sort matches by sequence to keep order consistent
    matches.sort((a, b) => {
      const eventA = currentData.events.find(e => e.id === a.event_id);
      const eventB = currentData.events.find(e => e.id === b.event_id);
      return (eventA?.sequence || 0) - (eventB?.sequence || 0);
    });

    const team1Scores = [];
    const team2Scores = [];

    matches.forEach(match => {
      const currentSet = match.current_set || 0;
      const setInfo = match.sets && match.sets[currentSet] ? match.sets[currentSet] : { team1_score: 0, team2_score: 0 };
      team1Scores.push(setInfo.team1_score);
      team2Scores.push(setInfo.team2_score);
    });

    return {
      team1: { name: team1?.name || 'Team 1', scores: team1Scores },
      team2: { name: team2?.name || 'Team 2', scores: team2Scores }
    };
  };

  const drawScoreboard = (ctx, width, height, data) => {
    const isLandscape = width > height;
    const sbWidth = isLandscape ? Math.min(width * 0.4, 450) : Math.min(width * 0.7, 320);
    const sbHeight = isLandscape ? Math.max(height * 0.15, 80) : Math.max(height * 0.1, 70);

    const padding = isLandscape ? 40 : 20;
    const x = width - sbWidth - padding;
    const y = padding;

    ctx.fillStyle = 'rgba(20, 20, 24, 0.3)';
    ctx.beginPath();
    if (ctx.roundRect) {
      ctx.roundRect(x, y, sbWidth, sbHeight, 12);
    } else {
      ctx.rect(x, y, sbWidth, sbHeight);
    }
    ctx.fill();

    ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(x, y + sbHeight / 2);
    ctx.lineTo(x + sbWidth, y + sbHeight / 2);

    const nameWidth = sbWidth * 0.4;
    const cols = 7;
    const colWidth = (sbWidth - nameWidth) / cols;

    for (let i = 0; i <= cols; i++) {
      const cx = x + nameWidth + i * colWidth;
      ctx.moveTo(cx, y);
      ctx.lineTo(cx, y + sbHeight);
    }
    ctx.stroke();

    ctx.fillStyle = '#ffffff';
    ctx.textBaseline = 'middle';

    const nameFont = `bold ${Math.max(10, sbHeight * 0.22)}px Inter, sans-serif`;
    const scoreFontSize = Math.max(8, Math.min(sbHeight * 0.20, colWidth * 0.55));
    const scoreFont = `bold ${scoreFontSize}px Inter, sans-serif`;

    const team1Y = y + sbHeight * 0.25;
    const team2Y = y + sbHeight * 0.75;

    ctx.font = nameFont;
    ctx.textAlign = 'left';
    ctx.shadowColor = 'rgba(0,0,0,0.5)';
    ctx.shadowBlur = 2;
    ctx.shadowOffsetX = 1;
    ctx.shadowOffsetY = 1;

    const maxNameWidth = nameWidth - 16;
    ctx.fillText(data.team1.name, x + 8, team1Y, maxNameWidth);
    ctx.fillText(data.team2.name, x + 8, team2Y, maxNameWidth);

    ctx.shadowColor = 'transparent';
    ctx.font = scoreFont;
    ctx.textAlign = 'center';

    for (let i = 0; i < cols; i++) {
      const cx = x + nameWidth + i * colWidth + colWidth / 2;
      const score1 = data.team1.scores[i] !== undefined ? data.team1.scores[i] : '-';
      const score2 = data.team2.scores[i] !== undefined ? data.team2.scores[i] : '-';

      ctx.fillText(score1, cx, team1Y);
      ctx.fillText(score2, cx, team2Y);
    }
  };

  const drawFrame = () => {
    if (!isRecording) return;
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return;

    const ctx = canvas.getContext('2d');
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    const scoreboardData = getScoreboardData();
    if (scoreboardData) {
      drawScoreboard(ctx, canvas.width, canvas.height, scoreboardData);
    }

    animationFrameRef.current = requestAnimationFrame(drawFrame);
  };

  const startStream = async () => {
    setError('');
    try {
      const videoConstraints = {
        facingMode: 'environment',
        width: { ideal: 1280 },
        height: { ideal: 720 }
      };

      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('Camera API not available. If you are on a mobile device, ensure you are accessing this site via HTTPS (secure context).');
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        video: videoConstraints,
        audio: true
      }).catch(() => navigator.mediaDevices.getUserMedia({ video: true, audio: true }));

      streamRef.current = stream;
      const video = videoRef.current;
      video.srcObject = stream;

      await new Promise((resolve) => {
        video.onloadedmetadata = async () => {
          try {
            await video.play();
          } catch (e) { console.error('Error playing video:', e); }
          resolve();
        };
      });

      const canvas = canvasRef.current;
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;

      if (recordedBlobUrl) {
        URL.revokeObjectURL(recordedBlobUrl);
        setRecordedBlobUrl(null);
      }
      recordedChunksRef.current = [];
      setIsRecording(true);

      if (selectedTournament) {
        updateTournament(selectedTournament, { is_live: true }).catch(err => console.error("Failed to update tournament live status", err));
      }

      const canvasStream = canvas.captureStream(30);
      const audioTracks = stream.getAudioTracks();
      if (audioTracks.length > 0) {
        canvasStream.addTrack(audioTracks[0]);
      }

      let options = {};
      if (MediaRecorder.isTypeSupported('video/mp4')) {
        options = { mimeType: 'video/mp4' };
      } else if (MediaRecorder.isTypeSupported('video/webm; codecs=vp9')) {
        options = { mimeType: 'video/webm; codecs=vp9' };
      } else if (MediaRecorder.isTypeSupported('video/webm')) {
        options = { mimeType: 'video/webm' };
      }

      if (streamKey) {
        const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        const wsHost = import.meta.env.DEV ? `${window.location.hostname}:8000` : window.location.host;
        const wsUrl = `${wsProtocol}//${wsHost}/ws/stream?key=${encodeURIComponent(streamKey)}`;

        const ws = new WebSocket(wsUrl);
        wsRef.current = ws;
        ws.onopen = () => console.log('WebSocket connected to streaming backend');
        ws.onerror = (e) => console.error('WebSocket error:', e);
      }

      const mediaRecorder = new MediaRecorder(canvasStream, options);
      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          recordedChunksRef.current.push(event.data);
          if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
            wsRef.current.send(event.data);
          }
        }
      };

      mediaRecorder.onstop = () => {
        const mimeType = options.mimeType || 'video/webm';
        const blob = new Blob(recordedChunksRef.current, { type: mimeType });
        setRecordedBlobUrl(URL.createObjectURL(blob));
      };

      mediaRecorder.start(1000);

      // We need a slight delay to ensure state updates before drawing
      setTimeout(() => drawFrame(), 100);

    } catch (err) {
      console.error('Error starting stream:', err);
      setError(err.message || 'Could not access camera/microphone. Please ensure permissions are granted.');
    }
  };

  const stopStream = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }

    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
    }

    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
    }

    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }

    setIsRecording(false);
    if (videoRef.current) videoRef.current.srcObject = null;

    if (selectedTournament) {
      updateTournament(selectedTournament, { is_live: false }).catch(err => console.error("Failed to update tournament live status", err));
    }
  };

  useEffect(() => {
    if (isRecording) {
      drawFrame();
    }
  }, [isRecording]);

  const activeFixture = tournamentData?.fixtures?.find(f => f.status === 'in_progress');

  return (
    <div className="dashboard-layout animate-fade-in">
      <div className="glass-card" style={{ marginBottom: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <Tv size={28} color="var(--accent-secondary)" />
          <h2>Broadcaster Dashboard</h2>
        </div>

        {error && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--accent-danger)', background: 'rgba(239, 68, 68, 0.1)', padding: '0.75rem', borderRadius: 'var(--radius-md)' }}>
            <AlertCircle size={18} />
            <span style={{ fontSize: '0.875rem' }}>{error}</span>
          </div>
        )}

        <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
          <div className="form-group" style={{ flex: 1, minWidth: '200px', marginBottom: 0 }}>
            <label className="form-label">Select Tournament</label>
            <select
              className="form-input"
              value={selectedTournament}
              onChange={(e) => handleTournamentSelect(e.target.value)}
              disabled={isRecording}
            >
              <option value="">-- Choose a Tournament --</option>
              {tournaments.map(t => (
                <option key={t.id} value={t.id}>
                  {t.name} {t.sport ? `(${t.sport})` : ''}
                </option>
              ))}
            </select>
          </div>

          <div className="form-group" style={{ flex: 1, minWidth: '200px', marginBottom: 0 }}>
            <label className="form-label">YouTube Stream Key</label>
            <input
              type="password"
              className="form-input"
              placeholder="Optional (for Local Record)"
              value={streamKey}
              onChange={(e) => setStreamKey(e.target.value)}
              disabled={isRecording}
            />
          </div>
        </div>

        {selectedTournament && (
          <div style={{ display: 'flex', gap: '1rem', alignItems: 'flex-end', flexWrap: 'wrap' }}>
            <div className="form-group" style={{ flex: 1, minWidth: '200px', marginBottom: 0 }}>
              <label className="form-label">YouTube Channel Handle (Public Link)</label>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <input
                  type="text"
                  className="form-input"
                  placeholder="e.g. @PalladioSports"
                  value={youtubeHandle}
                  onChange={(e) => setYoutubeHandle(e.target.value)}
                />
                <button
                  className={`btn ${handleSaved ? 'btn-outline' : 'btn-primary'}`}
                  onClick={handleSaveYoutubeLink}
                  disabled={savingHandle || handleSaved}
                  style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', whiteSpace: 'nowrap', backgroundColor: handleSaved ? 'var(--accent-success)' : undefined, color: handleSaved ? '#fff' : undefined, borderColor: handleSaved ? 'var(--accent-success)' : undefined }}
                >
                  {handleSaved ? <Check size={16} /> : <LinkIcon size={16} />}
                  {handleSaved ? 'Saved!' : 'Set Link'}
                </button>
              </div>
            </div>
          </div>
        )}        {selectedTournament && (
          <div style={{ padding: '0.75rem', background: 'var(--glass-bg)', border: '1px solid var(--glass-border)', borderRadius: 'var(--radius-md)', fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
            {activeFixture ? (
              <span style={{ color: 'var(--accent-success)' }}>Active Match Found: {tournamentData?.teams?.find(t => t.id === activeFixture.team1_id)?.name} vs {tournamentData?.teams?.find(t => t.id === activeFixture.team2_id)?.name}</span>
            ) : (
              <span>No active match found for this tournament.</span>
            )}
          </div>
        )}
      </div>

      <div className="glass-card" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        <div style={{ position: 'relative', width: '100%', aspectRatio: '16/9', background: 'var(--surface-dark)', borderRadius: 'var(--radius-lg)', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>

          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            style={{ position: 'absolute', opacity: 0, pointerEvents: 'none', width: '1px', height: '1px' }}
          />

          <canvas
            ref={canvasRef}
            style={{ display: isRecording ? 'block' : 'none', width: '100%', height: '100%', objectFit: 'contain' }}
          />

          {!isRecording && (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem', color: 'var(--text-muted)' }}>
              <Tv size={48} opacity={0.5} />
              <p>Ready to record</p>
            </div>
          )}
        </div>

        <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center' }}>
          {!isRecording ? (
            <button className="btn btn-primary" onClick={startStream} style={{ padding: '0.75rem 2rem' }}>
              <Play size={18} /> Start Stream
            </button>
          ) : (
            <button className="btn btn-danger" onClick={stopStream} style={{ padding: '0.75rem 2rem', background: 'var(--accent-danger)' }}>
              <Square size={18} /> Stop Stream
            </button>
          )}

          {recordedBlobUrl && !isRecording && (
            <a
              href={recordedBlobUrl}
              download={`stream-recording-${Date.now()}.webm`}
              className="btn btn-outline"
              style={{ textDecoration: 'none' }}
            >
              <Download size={18} /> Download Video
            </a>
          )}
        </div>
      </div>
    </div>
  );
}
