import React, { useEffect, useState } from 'react';
import { Player } from './models/Player';
import { createBalancedTeams } from './utils/teamUtils';
import LiveScoreBar from './components/LiveScoreBar';
import ScoringPanel from './components/ScoringPanel';
import MatchSummary from './components/MatchSummary';
import TeamEditor from './components/TeamEditor';
import { initialInningsState, applyOutcome, inningsSummary, ratingAdjustments } from './utils/scoring';
import { save, load } from './utils/storage';

function App() {
  // State management
  const [availablePlayers, setAvailablePlayers] = useState([
    new Player('Rishu', 9, 9),
    new Player('Dev', 4, 8),
    new Player('Abhishek', 8, 5),
    new Player('Priyanshu', 8, 4),
    new Player('Shubham', 7, 7),
    new Player('Shikhar', 6, 7),
    new Player('Sir', 7, 6),
    new Player('Naveen', 9, 8),
    new Player('Shivansh', 7, 9),
    new Player('Sunil', 7, 4),
    new Player('Kanishk', 7, 7),
    new Player('Garv', 6, 7),
    new Player('Abhijeet', 6, 6)
  ]);
  const [selectedPlayers, setSelectedPlayers] = useState([]);
  const [teams, setTeams] = useState({ team1: null, team2: null, commonPlayer: null });
  const [tossResult, setTossResult] = useState(null);
  const [showTeamEditor, setShowTeamEditor] = useState(false);
  // Scoring & summary state
  const [stage, setStage] = useState('setup'); // setup | innings1 | innings2 | summary
  const [innings1, setInnings1] = useState(null);
  const [innings2, setInnings2] = useState(null);
  const [summary1, setSummary1] = useState(null);
  const [summary2, setSummary2] = useState(null);
  const [finalResult, setFinalResult] = useState(null);
  const [battingFirstSelector, setBattingFirstSelector] = useState('team1');
  
  // Form states
  const [newPlayer, setNewPlayer] = useState({
    name: '',
    battingRating: '',
    bowlingRating: ''
  });
  
  const [tossChoice, setTossChoice] = useState('heads');
  const [tossDecision, setTossDecision] = useState('bat');
  // Captains state
  const [captains, setCaptains] = useState({ team1: null, team2: null });

  // Load players from storage if available
  useEffect(() => {
    const storedPlayers = load('players');
    if (storedPlayers && Array.isArray(storedPlayers) && storedPlayers.length > 0) {
      try {
        setAvailablePlayers(storedPlayers.map(p => Object.assign(new Player(p.name, p.battingRating, p.bowlingRating), { id: p.id })));
      } catch (_) {
        // ignore load errors
      }
    }
  }, []);

  // Player management
  const handleAddPlayer = () => {
    if (!newPlayer.name || !newPlayer.battingRating || !newPlayer.bowlingRating) {
      alert('Please fill all fields');
      return;
    }
    
    const player = new Player(
      newPlayer.name,
      parseInt(newPlayer.battingRating),
      parseInt(newPlayer.bowlingRating)
    );
    
    const updated = [...availablePlayers, player];
    setAvailablePlayers(updated);
    save('players', updated);
    setNewPlayer({ name: '', battingRating: '', bowlingRating: '' });
  };

  const handleRemovePlayer = (playerId) => {
    const updated = availablePlayers.filter(player => player.id !== playerId);
    setAvailablePlayers(updated);
    setSelectedPlayers(selectedPlayers.filter(player => player.id !== playerId));
    save('players', updated);
  };

  const handleSelectPlayer = (player) => {
    if (!selectedPlayers.find(p => p.id === player.id)) {
      setSelectedPlayers([...selectedPlayers, player]);
    }
  };

  const handleDeselectPlayer = (playerId) => {
    setSelectedPlayers(selectedPlayers.filter(player => player.id !== playerId));
  };

  const handleSelectAllPlayers = () => {
    setSelectedPlayers([...availablePlayers]);
  };

  const handleClearSelection = () => {
    setSelectedPlayers([]);
  };

  // Toss functionality
  const handleToss = () => {
    const coinResult = Math.random() < 0.5 ? 'heads' : 'tails';
    const wonToss = coinResult === tossChoice;
    
    setTossResult({
      coinResult,
      wonToss,
      choice: tossChoice,
      decision: tossDecision
    });
  };

  // Team creation
  const handleCreateTeams = () => {
    if (selectedPlayers.length < 2) {
      alert('Need at least 2 players to create teams');
      return;
    }
    if (!captains.team1 || !captains.team2) {
      alert('Please select captains for both teams before creating teams');
      return;
    }
    
    const { team1, team2, commonPlayer, error } = createBalancedTeams(selectedPlayers, "Team A", "Team B", captains);
    if (error) {
      alert(error);
      return;
    }
    
    setTeams({ team1, team2, commonPlayer });
    setTossResult(null);
    setCaptains({ team1: null, team2: null });
    setStage('setup');
    setInnings1(null);
    setInnings2(null);
    setSummary1(null);
    setSummary2(null);
    setFinalResult(null);
  };

  // Scoring flow
  const handleStartScoring = () => {
    if (!teams.team1 || !teams.team2) {
      alert('Please create teams first');
      return;
    }
    // Decide batting first using selector
    const battingFirst = battingFirstSelector === 'team1' ? teams.team1 : teams.team2;
    const bowlingFirst = battingFirstSelector === 'team1' ? teams.team2 : teams.team1;
    const inn1 = initialInningsState(battingFirst, bowlingFirst);
    setInnings1(inn1);
    setStage('innings1');
  };

  const recordBall = (outcome, bowlerId) => {
    if (stage === 'innings1' && innings1) {
      const next = applyOutcome({ ...innings1, batsmen: innings1.batsmen.map(b => ({ ...b })), bowlers: { ...innings1.bowlers } }, outcome, { bowlerId: Number(bowlerId) });
      setInnings1({ ...next });
    } else if (stage === 'innings2' && innings2) {
      const next = applyOutcome({ ...innings2, batsmen: innings2.batsmen.map(b => ({ ...b })), bowlers: { ...innings2.bowlers } }, outcome, { bowlerId: Number(bowlerId) });
      setInnings2({ ...next });
    }
  };

  const handleBatsmanChange = (newIndex) => {
    if (stage === 'innings1' && innings1) {
      setInnings1(prev => ({ ...prev, currentBatsmanIndex: newIndex }));
    } else if (stage === 'innings2' && innings2) {
      setInnings2(prev => ({ ...prev, currentBatsmanIndex: newIndex }));
    }
  };

  const endOver = () => {
    const closeOver = (inn) => {
      if (!inn || inn.ballsInOver === 0 || inn.ballsInOver >= 6) return inn;
      const n = { ...inn };
      n.overs += 1; n.ballsInOver = 0;
      return n;
    };
    if (stage === 'innings1' && innings1) setInnings1(prev => closeOver(prev));
    if (stage === 'innings2' && innings2) setInnings2(prev => closeOver(prev));
  };

  const endInnings = () => {
    if (stage === 'innings1' && innings1) {
      const sum1 = inningsSummary(innings1);
      setSummary1(sum1);
      // prepare innings 2
      const battingSecondName = innings1.bowlingTeam.name;
      const bowlingSecondName = innings1.battingTeam.name;
      // map back to Team objects from names
      const battingSecondTeam = teams.team1.name === battingSecondName ? teams.team1 : teams.team2;
      const bowlingSecondTeam = teams.team1.name === bowlingSecondName ? teams.team1 : teams.team2;
      const inn2 = initialInningsState(battingSecondTeam, bowlingSecondTeam);
      setInnings2(inn2);
      setStage('innings2');
    } else if (stage === 'innings2' && innings2) {
      const target = (summary1?.total || 0) + 1;
      const sum2 = inningsSummary(innings2, target);
      setSummary2(sum2);

      // compute result
      let winner = null; let text = '';
      if (sum2.total >= target) {
        winner = innings2.battingTeam.name;
        const wicketsLeft = innings2.batsmen.filter(b => !b.out).length;
        text = `${winner} won by ${wicketsLeft} wickets`;
      } else {
        winner = innings2.bowlingTeam.name;
        const runsBy = (target - 1) - sum2.total;
        text = `${winner} won by ${runsBy} runs`;
      }
      const res = { winner, text, target };
      setFinalResult(res);
      setStage('summary');

      // Rating adjustments
      const deltas1 = ratingAdjustments(summary1);
      const deltas2 = ratingAdjustments(sum2);
      const combined = { ...deltas1 };
      Object.entries(deltas2).forEach(([pid, d]) => {
        combined[pid] = combined[pid] || { battingDelta: 0, bowlingDelta: 0 };
        combined[pid].battingDelta += d.battingDelta;
        combined[pid].bowlingDelta += d.bowlingDelta;
      });
      const clamped = (v) => Math.max(1, Math.min(10, +v.toFixed(1)));
      const updatedPlayers = availablePlayers.map(p => {
        const d = combined[p.id];
        if (!d) return p;
        return {
          ...p,
          battingRating: clamped(p.battingRating + d.battingDelta),
          bowlingRating: clamped(p.bowlingRating + d.bowlingDelta),
          totalRating: clamped(p.battingRating + d.battingDelta) + clamped(p.bowlingRating + d.bowlingDelta)
        };
      });
      setAvailablePlayers(updatedPlayers);
      save('players', updatedPlayers);

      // persist match data
      const matchData = {
        timestamp: Date.now(),
        teams: { team1: teams.team1?.name, team2: teams.team2?.name },
        innings1: summary1,
        innings2: sum2,
        result: res,
      };
      const hist = load('matches', []);
      save('matches', [matchData, ...hist]);
    }
  };

  const handleUpdateTeams = (updatedTeams) => {
    setTeams(updatedTeams);
    setShowTeamEditor(false); // Close the editor after updating
  };

  const handleCloseTeamEditor = () => {
    setShowTeamEditor(false);
  };

  const resetForNewMatch = () => {
    setStage('setup');
    setInnings1(null);
    setInnings2(null);
    setSummary1(null);
    setSummary2(null);
    setFinalResult(null);
    setTeams({ team1: null, team2: null, commonPlayer: null });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-blue-50 p-4">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-4xl font-bold text-center text-gray-800 mb-8">🏏 Cricket Match App</h1>
        
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left Column - Player Management */}
          <div className="space-y-6">
            {/* Add Player Form */}
            <div className="bg-white rounded-lg shadow-md p-6">
              <h2 className="text-2xl font-semibold mb-4 text-gray-700">Add Player</h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-600 mb-1">Player Name</label>
                  <input
                    type="text"
                    value={newPlayer.name}
                    onChange={(e) => setNewPlayer({...newPlayer, name: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Enter player name"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-600 mb-1">Batting Rating (1-10)</label>
                    <input
                      type="number"
                      min="1"
                      max="10"
                      value={newPlayer.battingRating}
                      onChange={(e) => setNewPlayer({...newPlayer, battingRating: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="1-10"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-600 mb-1">Bowling Rating (1-10)</label>
                    <input
                      type="number"
                      min="1"
                      max="10"
                      value={newPlayer.bowlingRating}
                      onChange={(e) => setNewPlayer({...newPlayer, bowlingRating: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="1-10"
                    />
                  </div>
                </div>
                <button
                  onClick={handleAddPlayer}
                  className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 transition duration-200"
                >
                  Add Player
                </button>
              </div>
            </div>

            {/* Players List */}
            <div className="bg-white rounded-lg shadow-md p-6">
              <h2 className="text-2xl font-semibold mb-4 text-gray-700">Players ({availablePlayers.length})</h2>
              {availablePlayers.length === 0 ? (
                <p className="text-gray-500 text-center py-4">No players added yet</p>
              ) : (
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {availablePlayers.map(player => (
                    <div key={player.id} className="flex justify-between items-center bg-gray-50 p-3 rounded-md">
                      <div>
                        <span className="font-medium">{player.name}</span>
                        <div className="text-sm text-gray-600">
                          Bat: {player.battingRating} | Bowl: {player.bowlingRating} | Total: {player.totalRating}
                        </div>
                      </div>
                      <div className="flex items-center space-x-3">
                        {selectedPlayers.find(p => p.id === player.id) ? (
                          <button
                            onClick={() => handleDeselectPlayer(player.id)}
                            className="text-yellow-700 hover:text-yellow-900"
                          >
                            Deselect
                          </button>
                        ) : (
                          <button
                            onClick={() => handleSelectPlayer(player)}
                            className="text-green-700 hover:text-green-900"
                          >
                            Select
                          </button>
                        )}
                        <button
                          onClick={() => handleRemovePlayer(player.id)}
                          className="text-red-600 hover:text-red-800"
                        >
                          Remove
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
            {/* Selected Players */}
            <div className="bg-white rounded-lg shadow-md p-6 mt-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-2xl font-semibold text-gray-700">Selected Players ({selectedPlayers.length})</h2>
                <div className="space-x-2">
                  <button onClick={handleSelectAllPlayers} className="px-3 py-1 rounded-md bg-gray-200 hover:bg-gray-300 text-gray-800">Select All</button>
                  <button onClick={handleClearSelection} className="px-3 py-1 rounded-md bg-gray-200 hover:bg-gray-300 text-gray-800">Clear</button>
                </div>
              </div>
              {selectedPlayers.length === 0 ? (
                <p className="text-gray-500 text-center py-4">No players selected</p>
              ) : (
                <div className="grid grid-cols-2 gap-3 max-h-48 overflow-y-auto">
                  {selectedPlayers.map(player => (
                    <div key={player.id} className="flex items-center justify-between bg-gray-50 px-3 py-2 rounded-md">
                      <span className="text-sm font-medium">{player.name}</span>
                      <button onClick={() => handleDeselectPlayer(player.id)} className="text-xs text-red-600 hover:text-red-800">Remove</button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Right Column - Game Controls */}
          <div className="space-y-6">
            {/* Toss Section */}
            <div className="bg-white rounded-lg shadow-md p-6">
              <h2 className="text-2xl font-semibold mb-4 text-gray-700">Toss</h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-600 mb-2">Choose Your Call</label>
                  <div className="flex space-x-4">
                    <button
                      onClick={() => setTossChoice('heads')}
                      className={`px-4 py-2 rounded-md ${tossChoice === 'heads' ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-700'}`}
                    >
                      Heads
                    </button>
                    <button
                      onClick={() => setTossChoice('tails')}
                      className={`px-4 py-2 rounded-md ${tossChoice === 'tails' ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-700'}`}
                    >
                      Tails
                    </button>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-600 mb-2">If You Win, You'll</label>
                  <div className="flex space-x-4">
                    <button
                      onClick={() => setTossDecision('bat')}
                      className={`px-4 py-2 rounded-md ${tossDecision === 'bat' ? 'bg-green-600 text-white' : 'bg-gray-200 text-gray-700'}`}
                    >
                      Bat First
                    </button>
                    <button
                      onClick={() => setTossDecision('bowl')}
                      className={`px-4 py-2 rounded-md ${tossDecision === 'bowl' ? 'bg-green-600 text-white' : 'bg-gray-200 text-gray-700'}`}
                    >
                      Bowl First
                    </button>
                  </div>
                </div>
                <button
                  onClick={handleToss}
                  className="w-full bg-purple-600 text-white py-2 px-4 rounded-md hover:bg-purple-700 transition duration-200"
                >
                  Flip Coin
                </button>
                
                {tossResult && (
                  <div className={`mt-4 p-4 rounded-md ${tossResult.wonToss ? 'bg-green-100 border-green-400' : 'bg-red-100 border-red-400'} border`}>
                    <p className="font-semibold">
                      Coin landed on: <span className="uppercase">{tossResult.coinResult}</span>
                    </p>
                    <p className={tossResult.wonToss ? 'text-green-700' : 'text-red-700'}>
                      {tossResult.wonToss ? 'You won the toss!' : 'You lost the toss!'}
                    </p>
                    {tossResult.wonToss && (
                      <p className="text-green-700">You chose to {tossResult.decision} first</p>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Team Creation */}
            <div className="bg-white rounded-lg shadow-md p-6">
              <h2 className="text-2xl font-semibold mb-4 text-gray-700">Team Creation</h2>
              {/* Captain Selection */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <div>
                  <label className="block text-sm font-medium text-gray-600 mb-1">Captain - Team A</label>
                  <select
                    value={captains.team1?.id || ''}
                    onChange={(e) => {
                      const p = selectedPlayers.find(sp => String(sp.id) === e.target.value);
                      setCaptains({ ...captains, team1: p || null });
                    }}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Select captain</option>
                    {selectedPlayers.map(p => (
                      <option key={p.id} value={p.id}>{p.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-600 mb-1">Captain - Team B</label>
                  <select
                    value={captains.team2?.id || ''}
                    onChange={(e) => {
                      const p = selectedPlayers.find(sp => String(sp.id) === e.target.value);
                      setCaptains({ ...captains, team2: p || null });
                    }}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Select captain</option>
                    {selectedPlayers.map(p => (
                      <option key={p.id} value={p.id}>{p.name}</option>
                    ))}
                  </select>
                </div>
              </div>
              <button
                onClick={handleCreateTeams}
                className="w-full bg-orange-600 text-white py-2 px-4 rounded-md hover:bg-orange-700 transition duration-200"
              >
                Create Balanced Teams
              </button>
              
              {teams.team1 && teams.team2 && (
                <div className="mt-4 space-y-4">
                  <div className="flex justify-center">
                    <button
                      onClick={() => setShowTeamEditor(!showTeamEditor)}
                      className={`px-4 py-2 rounded-md text-sm font-medium transition duration-200 ${
                        showTeamEditor
                          ? 'bg-green-600 text-white hover:bg-green-700'
                          : 'bg-indigo-600 text-white hover:bg-indigo-700'
                      }`}
                    >
                      {showTeamEditor ? 'Hide Team Editor' : 'Edit Teams'}
                    </button>
                  </div>
                  
                  {showTeamEditor && (
                    <TeamEditor
                      teams={teams}
                      availablePlayers={availablePlayers}
                      selectedPlayers={selectedPlayers}
                      onUpdateTeams={handleUpdateTeams}
                      onClose={handleCloseTeamEditor}
                    />
                  )}
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-blue-50 p-4 rounded-md">
                      <h3 className="font-semibold text-blue-800">{teams.team1.name}</h3>
                      <p className="text-sm text-blue-600">Players: {teams.team1.players.length}</p>
                      <p className="text-sm text-blue-600">Batting: {teams.team1.totalBattingRating}</p>
                      <p className="text-sm text-blue-600">Bowling: {teams.team1.totalBowlingRating}</p>
                      <p className="text-sm font-medium text-blue-800">Total: {teams.team1.totalRating}</p>
                      <div className="mt-2">
                        <h4 className="text-xs font-medium text-blue-700 mb-1">Players:</h4>
                        <div className="text-xs text-blue-600 space-y-1">
                          {teams.team1.players.map(player => (
                            <div key={player.id} className="bg-blue-100 px-2 py-1 rounded">
                              {player.name} (B: {player.battingRating}, Bowl: {player.bowlingRating})
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                    <div className="bg-red-50 p-4 rounded-md">
                      <h3 className="font-semibold text-red-800">{teams.team2.name}</h3>
                      <p className="text-sm text-red-600">Players: {teams.team2.players.length}</p>
                      <p className="text-sm text-red-600">Batting: {teams.team2.totalBattingRating}</p>
                      <p className="text-sm text-red-600">Bowling: {teams.team2.totalBowlingRating}</p>
                      <p className="text-sm font-medium text-red-800">Total: {teams.team2.totalRating}</p>
                      <div className="mt-2">
                        <h4 className="text-xs font-medium text-red-700 mb-1">Players:</h4>
                        <div className="text-xs text-red-600 space-y-1">
                          {teams.team2.players.map(player => (
                            <div key={player.id} className="bg-red-100 px-2 py-1 rounded">
                              {player.name} (B: {player.battingRating}, Bowl: {player.bowlingRating})
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Scoring & Summary */}
            <div className="bg-white rounded-lg shadow-md p-6">
              <h2 className="text-2xl font-semibold mb-4 text-gray-700">Scoring</h2>
              {!teams.team1 || !teams.team2 ? (
                <p className="text-gray-500">Create teams to start scoring.</p>
              ) : (
                <div className="space-y-4">
                  {stage === 'setup' && (
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-600 mb-2">Who bats first?</label>
                        <div className="grid grid-cols-2 gap-2">
                          <button
                            onClick={() => setBattingFirstSelector('team1')}
                            className={`px-3 py-2 rounded-md border ${battingFirstSelector==='team1' ? 'bg-blue-600 text-white border-blue-600' : 'bg-gray-100 text-gray-800 border-gray-300'}`}
                          >
                            {teams.team1.name}
                          </button>
                          <button
                            onClick={() => setBattingFirstSelector('team2')}
                            className={`px-3 py-2 rounded-md border ${battingFirstSelector==='team2' ? 'bg-blue-600 text-white border-blue-600' : 'bg-gray-100 text-gray-800 border-gray-300'}`}
                          >
                            {teams.team2.name}
                          </button>
                        </div>
                      </div>
                      <button onClick={handleStartScoring} className="w-full bg-green-600 text-white py-2 px-4 rounded-md hover:bg-green-700">Start Scoring</button>
                    </div>
                  )}

                  {stage === 'innings1' && innings1 && (
                    <div className="space-y-4">
                      <LiveScoreBar title={`${innings1.battingTeam.name} vs ${innings1.bowlingTeam.name}`} runs={innings1.totalRuns} wickets={innings1.wickets} overs={`${innings1.overs}.${innings1.ballsInOver}`} />
                      <ScoringPanel innings={innings1} onBall={recordBall} onEndOver={endOver} onEndInnings={endInnings} onBatsmanChange={handleBatsmanChange} />
                    </div>
                  )}

                  {stage === 'innings2' && innings2 && (
                    <div className="space-y-4">
                      <LiveScoreBar title={`${innings2.battingTeam.name} chase`} runs={innings2.totalRuns} wickets={innings2.wickets} overs={`${innings2.overs}.${innings2.ballsInOver}`} target={(summary1?.total || 0) + 1} />
                      <ScoringPanel innings={innings2} onBall={recordBall} onEndOver={endOver} onEndInnings={endInnings} onBatsmanChange={handleBatsmanChange} />
                    </div>
                  )}

                  {stage === 'summary' && summary1 && summary2 && (
                    <MatchSummary innings1={summary1} innings2={summary2} result={finalResult} onNewMatch={resetForNewMatch} />
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;
