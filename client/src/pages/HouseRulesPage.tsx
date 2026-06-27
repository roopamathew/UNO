import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { GlassCard } from '@/components/ui/GlassCard';
import { useLobbyStore } from '@/stores/lobbyStore';
import type { HouseRulesConfig, CustomRule } from '@uno/shared';
import { DEFAULT_HOUSE_RULES } from '@uno/shared';

interface RuleToggleProps {
  label: string;
  description: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}

function RuleToggle({ label, description, checked, onChange }: RuleToggleProps) {
  return (
    <label className="flex items-start gap-3 p-4 rounded-xl bg-white/5 cursor-pointer hover:bg-white/8 transition-colors">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="mt-1 w-4 h-4 rounded accent-uno-red"
      />
      <div>
        <span className="font-medium block">{label}</span>
        <span className="text-sm text-white/40">{description}</span>
      </div>
    </label>
  );
}

export function HouseRulesPage() {
  const { roomId } = useParams<{ roomId: string }>();
  const navigate = useNavigate();
  const { room, isHost, updateHouseRules } = useLobbyStore();
  const [rules, setRules] = useState<HouseRulesConfig>(DEFAULT_HOUSE_RULES);
  const [customRuleName, setCustomRuleName] = useState('');
  const [customRuleDesc, setCustomRuleDesc] = useState('');

  useEffect(() => {
    if (room?.houseRules) {
      setRules(room.houseRules);
    }
  }, [room]);

  if (!isHost) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-8 text-center">
        <p className="text-white/50">Only the host can edit house rules.</p>
        <Button variant="secondary" className="mt-4" onClick={() => navigate(-1)}>
          Back to Lobby
        </Button>
      </div>
    );
  }

  const updateRule = <K extends keyof HouseRulesConfig>(key: K, value: HouseRulesConfig[K]) => {
    setRules((prev) => ({ ...prev, [key]: value }));
  };

  const addCustomRule = () => {
    if (!customRuleName.trim()) return;
    const newRule: CustomRule = {
      id: crypto.randomUUID(),
      name: customRuleName.trim(),
      description: customRuleDesc.trim(),
      enabled: true,
    };
    updateRule('customRules', [...rules.customRules, newRule]);
    setCustomRuleName('');
    setCustomRuleDesc('');
  };

  const removeCustomRule = (id: string) => {
    updateRule(
      'customRules',
      rules.customRules.filter((r) => r.id !== id),
    );
  };

  const handleSave = () => {
    updateHouseRules(rules);
    navigate(`/lobby/${roomId}`);
  };

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <h1 className="text-3xl font-display font-bold mb-2">House Rules</h1>
      <p className="text-white/50 mb-8">Configure game rules before starting the match</p>

      <div className="space-y-6">
        <GlassCard>
          <h2 className="font-semibold mb-4">Standard Variants</h2>
          <div className="space-y-2">
            <RuleToggle
              label="Stack Draw Two"
              description="Allow stacking +2 cards on each other"
              checked={rules.stackDrawTwo}
              onChange={(v) => updateRule('stackDrawTwo', v)}
            />
            <RuleToggle
              label="Stack Wild Draw Four"
              description="Allow stacking +4 cards on each other"
              checked={rules.stackWildDrawFour}
              onChange={(v) => updateRule('stackWildDrawFour', v)}
            />
            <RuleToggle
              label="Jump-In"
              description="Play a matching card out of turn"
              checked={rules.jumpIn}
              onChange={(v) => updateRule('jumpIn', v)}
            />
            <RuleToggle
              label="Seven-O"
              description="Swap hands when a 7 is played, pass a card on 0"
              checked={rules.sevenO}
              onChange={(v) => updateRule('sevenO', v)}
            />
            <RuleToggle
              label="Force Play"
              description="Must play if you have a valid card"
              checked={rules.forcePlay}
              onChange={(v) => updateRule('forcePlay', v)}
            />
            <RuleToggle
              label="Draw Until Playable"
              description="Keep drawing until you can play"
              checked={rules.drawUntilPlayable}
              onChange={(v) => updateRule('drawUntilPlayable', v)}
            />
          </div>
        </GlassCard>

        <GlassCard>
          <h2 className="font-semibold mb-4">Game Settings</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Winning Score"
              type="number"
              value={rules.winningScore}
              onChange={(e) => updateRule('winningScore', parseInt(e.target.value) || 500)}
              min={100}
              max={10000}
            />
            <Input
              label="Number of Decks"
              type="number"
              value={rules.numberOfDecks}
              onChange={(e) => updateRule('numberOfDecks', parseInt(e.target.value) || 1)}
              min={1}
              max={4}
            />
            <Input
              label="Turn Timer (seconds)"
              type="number"
              value={rules.turnTimerSeconds}
              onChange={(e) => updateRule('turnTimerSeconds', parseInt(e.target.value) || 30)}
              min={0}
              max={300}
            />
            <Input
              label="Custom Score Limit"
              type="number"
              value={rules.customScoreLimit}
              onChange={(e) => updateRule('customScoreLimit', parseInt(e.target.value) || 0)}
              min={0}
            />
          </div>
        </GlassCard>

        <GlassCard>
          <h2 className="font-semibold mb-4">Custom Rules</h2>
          {rules.customRules.map((rule) => (
            <div key={rule.id} className="flex items-center justify-between p-3 rounded-xl bg-white/5 mb-2">
              <div>
                <span className="font-medium">{rule.name}</span>
                {rule.description && (
                  <p className="text-sm text-white/40">{rule.description}</p>
                )}
              </div>
              <button
                onClick={() => removeCustomRule(rule.id)}
                className="text-red-400 hover:text-red-300 text-sm"
              >
                Remove
              </button>
            </div>
          ))}
          <div className="space-y-3 mt-4">
            <Input
              label="Rule Name"
              value={customRuleName}
              onChange={(e) => setCustomRuleName(e.target.value)}
              placeholder="e.g., Reverse Stack"
            />
            <Input
              label="Description"
              value={customRuleDesc}
              onChange={(e) => setCustomRuleDesc(e.target.value)}
              placeholder="Describe the rule..."
            />
            <Button variant="secondary" onClick={addCustomRule} disabled={!customRuleName.trim()}>
              Add Custom Rule
            </Button>
          </div>
        </GlassCard>

        <div className="flex gap-3">
          <Button onClick={handleSave}>Save Rules</Button>
          <Button variant="ghost" onClick={() => navigate(`/lobby/${roomId}`)}>
            Cancel
          </Button>
        </div>
      </div>
    </div>
  );
}
