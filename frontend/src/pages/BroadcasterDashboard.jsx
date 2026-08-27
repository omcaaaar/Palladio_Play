import { useState, useEffect, useRef } from 'react';
import { getTournaments, getTournamentFull, updateTournament } from '../api/client';
import { Tv, Play, Square, Download, AlertCircle, RefreshCw, Link as LinkIcon, Check, Activity } from 'lucide-react';
import html2canvas from 'html2canvas';
import { StandingsTable, PlayoffBracket, details, getStandings } from './PublicPages';

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
  const [error, setError] = useState('');

  const [overlayState, setOverlayState] = useState('none');
  const [overlayCanvas, setOverlayCanvas] = useState(null);
  const hiddenUiRef = useRef(null);
  const overlayStateRef = useRef('none');
  const overlayCanvasRef = useRef(null);

  useEffect(() => {
    overlayStateRef.current = overlayState;
  }, [overlayState]);

  useEffect(() => {
    overlayCanvasRef.current = overlayCanvas;
  }, [overlayCanvas]);

  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const wsRef = useRef(null);
  const animationFrameRef = useRef(null);
  const streamRef = useRef(null);

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
    if (!tournamentData) {
      setOverlayState('none');
      return;
    }
    const { fixtures } = tournamentData;
    if (!fixtures || fixtures.length === 0) {
      setOverlayState('none');
      return;
    }

    const hasInProgress = fixtures.some(f => !f.is_frozen && (f.status === 'in_progress' || f.status === 'completed'));
    if (hasInProgress) {
      setOverlayState('scorecard');
      return;
    }

    const hasLocked = fixtures.some(f => f.is_frozen);
    if (hasLocked) {
      const leagueFixtures = fixtures.filter(f => f.match_type === 'league');
      const allLeagueCompleted = leagueFixtures.length === 0 || leagueFixtures.every(f => f.is_frozen);

      const playoffTypes = ['qualifier_1', 'eliminator', 'qualifier_2', 'semi_final', 'final'];
      const hasPlayoffs = fixtures.some(f => playoffTypes.includes(f.match_type));

      if (allLeagueCompleted && hasPlayoffs) {
        setOverlayState('bracket');
      } else {
        setOverlayState('standings');
      }
    } else {
      setOverlayState('none');
    }
  }, [tournamentData]);

  useEffect(() => {
    if (overlayState === 'standings' || overlayState === 'bracket') {
      const timeoutId = setTimeout(() => {
        if (hiddenUiRef.current) {
          html2canvas(hiddenUiRef.current, { backgroundColor: null, scale: 2 }).then(canvas => {
            setOverlayCanvas(canvas);
          });
        }
      }, 500);
      return () => clearTimeout(timeoutId);
    } else {
      setOverlayCanvas(null);
    }
  }, [tournamentData, overlayState]);

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

  const handleToggleLive = async () => {
    if (!selectedTournament || !tournamentData?.tournament) return;
    const newStatus = !tournamentData.tournament.is_live;
    try {
      await updateTournament(selectedTournament, { is_live: newStatus });
      setTournamentData({ ...tournamentData, tournament: { ...tournamentData.tournament, is_live: newStatus } });
    } catch (err) {
      setError('Failed to update live status: ' + err.message);
    }
  };

  const getScoreboardData = () => {
    const currentData = tournamentDataRef.current;
    if (!currentData) return null;
    const { fixtures, teams, scorecards, events } = currentData;
    if (!fixtures || fixtures.length === 0) return null;

    const activeFixture = fixtures.find(f => !f.is_frozen && (f.status === 'in_progress' || f.status === 'completed'));
    if (!activeFixture) return null;

    const team1 = teams.find(t => t.id === activeFixture.team1_id);
    const team2 = teams.find(t => t.id === activeFixture.team2_id);

    const matches = (scorecards || []).filter(s => s.fixture_id === activeFixture.id);

    // Calculate overall wins for team1 and team2 in this fixture
    let team1Wins = 0;
    let team2Wins = 0;
    matches.forEach(m => {
      if (m.winner === 'team1') team1Wins++;
      else if (m.winner === 'team2') team2Wins++;
    });

    // Find the currently active match (event)
    let activeMatch = matches.find(m => m.status === 'in_progress');

    // If no match is in progress, maybe one is pending or we just finished one.
    // Let's fallback to the last completed one or first pending one if no active match.
    if (!activeMatch) {
      const completedMatches = matches.filter(m => m.status === 'completed');
      if (completedMatches.length > 0) {
        // Get the last completed match based on sequence or just the last in array
        activeMatch = completedMatches[completedMatches.length - 1];
      } else {
        const pendingMatches = matches.filter(m => m.status === 'pending');
        if (pendingMatches.length > 0) {
          activeMatch = pendingMatches[0];
        } else {
          return null; // No matches at all
        }
      }
    }

    const currentEvent = events?.find(e => e.id === activeMatch.event_id);
    const eventName = currentEvent?.name || 'Event';

    const numSets = activeMatch.num_sets || 1;
    const team1Scores = [];
    const team2Scores = [];

    for (let i = 0; i < numSets; i++) {
      const setInfo = activeMatch.sets && activeMatch.sets[i] ? activeMatch.sets[i] : { team1_score: 0, team2_score: 0 };
      team1Scores.push(setInfo.team1_score);
      team2Scores.push(setInfo.team2_score);
    }

    let matchTypeStr = '';
    if (activeFixture.match_type) {
      matchTypeStr = activeFixture.match_type.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
    }

    return {
      team1: { name: team1?.name || 'Team 1', wins: team1Wins, scores: team1Scores },
      team2: { name: team2?.name || 'Team 2', wins: team2Wins, scores: team2Scores },
      eventName: eventName,
      matchType: matchTypeStr,
      numSets: numSets
    };
  };

  const drawScoreboard = (ctx, width, height, data) => {
    const isLandscape = width > height;
    const sbWidth = isLandscape ? Math.min(width * 0.38, 420) : Math.min(width * 0.65, 300);
    const sbHeight = isLandscape ? Math.max(height * 0.16, 80) : Math.max(height * 0.12, 70);

    const padding = isLandscape ? 40 : 20;
    const x = width - sbWidth - padding;
    const y = padding;

    // Background
    ctx.fillStyle = 'rgba(20, 20, 24, 0.4)';
    ctx.beginPath();
    if (ctx.roundRect) {
      ctx.roundRect(x, y, sbWidth, sbHeight, 12);
    } else {
      ctx.rect(x, y, sbWidth, sbHeight);
    }
    ctx.fill();

    const nameWidth = sbWidth * 0.4;
    const winsWidth = sbWidth * 0.15;
    const eventWidth = sbWidth - nameWidth - winsWidth;

    // Draw horizontal lines (2 lines for 3 rows)
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    const rowHeight = sbHeight / 3;
    ctx.moveTo(x, y + rowHeight);
    ctx.lineTo(x + sbWidth, y + rowHeight);
    ctx.moveTo(x, y + rowHeight * 2);
    ctx.lineTo(x + sbWidth, y + rowHeight * 2);

    // Draw vertical lines
    // 1. Between Name and Wins
    ctx.moveTo(x + nameWidth, y);
    ctx.lineTo(x + nameWidth, y + sbHeight);
    // 2. Between Wins and Event
    ctx.moveTo(x + nameWidth + winsWidth, y);
    ctx.lineTo(x + nameWidth + winsWidth, y + sbHeight);

    // 3. Sub-columns in Event section (only in Team 1 and Team 2 rows)
    const numSets = data.numSets || 1;
    const subColWidth = eventWidth / numSets;
    for (let i = 1; i < numSets; i++) {
      const cx = x + nameWidth + winsWidth + i * subColWidth;
      ctx.moveTo(cx, y + rowHeight); // Start from row 2
      ctx.lineTo(cx, y + sbHeight);
    }
    ctx.stroke();

    ctx.fillStyle = '#ffffff';
    ctx.textBaseline = 'middle';

    const headerFont = `bold ${Math.max(10, sbHeight * 0.15)}px Inter, sans-serif`;
    const nameFont = `bold ${Math.max(11, sbHeight * 0.18)}px Inter, sans-serif`;
    const scoreFont = `bold ${Math.max(12, sbHeight * 0.2)}px Inter, sans-serif`;

    const headerY = y + rowHeight / 2;
    const team1Y = y + rowHeight * 1.5;
    const team2Y = y + rowHeight * 2.5;

    // Draw Headers
    ctx.font = headerFont;
    ctx.shadowColor = 'rgba(0,0,0,0.5)';
    ctx.shadowBlur = 2;
    ctx.shadowOffsetX = 1;
    ctx.shadowOffsetY = 1;

    if (data.matchType) {
      ctx.textAlign = 'left';
      ctx.fillStyle = '#38bdf8'; // Light blue for match type
      const maxNameWidth = nameWidth - 16;
      ctx.fillText(data.matchType, x + 8, headerY, maxNameWidth);
    }

    ctx.textAlign = 'center';
    ctx.fillStyle = '#4ade80'; // Green for wins header
    ctx.fillText("Wins", x + nameWidth + winsWidth / 2, headerY);

    ctx.fillStyle = '#ffffff'; // Revert to white
    ctx.fillText(data.eventName, x + nameWidth + winsWidth + eventWidth / 2, headerY, eventWidth - 10);

    // Draw Names
    ctx.font = nameFont;
    ctx.textAlign = 'left';
    const maxNameWidth = nameWidth - 16;
    ctx.fillText(data.team1.name, x + 8, team1Y, maxNameWidth);
    ctx.fillText(data.team2.name, x + 8, team2Y, maxNameWidth);

    // Draw Wins
    ctx.fillStyle = '#4ade80'; // Green for wins count
    ctx.font = scoreFont;
    ctx.textAlign = 'center';
    ctx.fillText(data.team1.wins.toString(), x + nameWidth + winsWidth / 2, team1Y);
    ctx.fillText(data.team2.wins.toString(), x + nameWidth + winsWidth / 2, team2Y);
    ctx.fillStyle = '#ffffff'; // Revert to white for scores

    // Draw Scores
    for (let i = 0; i < numSets; i++) {
      const cx = x + nameWidth + winsWidth + i * subColWidth + subColWidth / 2;
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

    const currentState = overlayStateRef.current;

    if (currentState === 'scorecard') {
      const scoreboardData = getScoreboardData();
      if (scoreboardData) {
        drawScoreboard(ctx, canvas.width, canvas.height, scoreboardData);
      }
    } else if (currentState === 'standings' || currentState === 'bracket') {
      const oCanvas = overlayCanvasRef.current;
      if (oCanvas) {
        const paddingX = canvas.width * 0.1;
        const paddingY = canvas.height * 0.1;
        const maxWidth = canvas.width - paddingX * 2;
        const maxHeight = canvas.height - paddingY * 2;

        const scale = Math.min(maxWidth / oCanvas.width, maxHeight / oCanvas.height);
        const w = oCanvas.width * scale;
        const h = oCanvas.height * scale;
        const x = (canvas.width - w) / 2;
        const y = (canvas.height - h) / 2;

        ctx.fillStyle = 'rgba(0, 0, 0, 0.2)'; // Very subtle dimming to keep court highly visible
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        ctx.drawImage(oCanvas, x, y, w, h);
      }
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
          if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
            wsRef.current.send(event.data);
          }
        }
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

  const activeFixture = tournamentData?.fixtures?.find(f => !f.is_frozen && (f.status === 'in_progress' || f.status === 'completed'));

  const renderHiddenUI = () => {
    if (!tournamentData) return null;
    if (overlayState !== 'standings' && overlayState !== 'bracket') return null;

    const { fixtures, events, scorecards, teams, getTeamName } = details(tournamentData);
    const standings = getStandings(tournamentData);

    if (overlayState === 'standings') {
      const groups = [...new Set(teams.map(t => t.group).filter(Boolean))];
      return (
        <div style={{ padding: '2rem', width: '1000px', background: 'rgba(20, 20, 24, 0.3)', color: 'white', borderRadius: '16px', fontFamily: 'Inter, sans-serif' }}>
          <h2 style={{ textAlign: 'center', marginBottom: '1.5rem', color: 'white', textShadow: '1px 1px 3px rgba(0,0,0,0.8)' }}>League Standings</h2>
          {groups.length > 0 ? (
            groups.map(g => (
              <div key={g} style={{ marginBottom: '1.5rem' }}>
                <h4 style={{ color: '#38bdf8', marginBottom: '0.75rem' }}>Group {g}</h4>
                <StandingsTable standings={standings.filter(s => s.group === g)} />
              </div>
            ))
          ) : (
            <StandingsTable standings={standings} />
          )}
        </div>
      );
    } else if (overlayState === 'bracket') {
      return (
        <div style={{ padding: '2rem', width: '1000px', background: 'rgba(20, 20, 24, 0.3)', color: 'white', borderRadius: '16px', fontFamily: 'Inter, sans-serif' }}>
          <h2 style={{ textAlign: 'center', marginBottom: '1.5rem', color: 'white', textShadow: '1px 1px 3px rgba(0,0,0,0.8)' }}>Playoffs</h2>
          <PlayoffBracket
            fixtures={fixtures}
            getTeamName={getTeamName}
            events={events}
            scorecards={scorecards}
          />
        </div>
      );
    }
    return null;
  };

  return (
    <div className="dashboard-layout animate-fade-in">
      <div
        ref={hiddenUiRef}
        style={{ position: 'absolute', top: '-9999px', left: '-9999px', zIndex: -999, pointerEvents: 'none' }}
      >
        {renderHiddenUI()}
      </div>

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
                  {t.name}
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

            <div className="form-group" style={{ minWidth: '200px', marginBottom: 0 }}>
              <label className="form-label">Live Stream Status</label>
              <button
                className={`btn`}
                onClick={handleToggleLive}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  width: '100%',
                  justifyContent: 'center',
                  background: tournamentData?.tournament?.is_live ? 'rgba(16, 185, 129, 0.2)' : 'var(--glass-bg)',
                  color: tournamentData?.tournament?.is_live ? 'var(--accent-success)' : 'var(--text-secondary)',
                  border: `1px solid ${tournamentData?.tournament?.is_live ? 'var(--accent-success)' : 'var(--glass-border)'}`,
                  transition: 'all 0.2s ease'
                }}
              >
                <Activity size={18} className={tournamentData?.tournament?.is_live ? 'pulse' : ''} />
                {tournamentData?.tournament?.is_live ? 'Stream is Live' : 'Stream is Offline'}
              </button>
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
        </div>
      </div>
    </div>
  );
}
