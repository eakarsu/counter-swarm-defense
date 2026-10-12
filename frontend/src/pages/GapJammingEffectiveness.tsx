import AIWorkspace from "../components/AIWorkspace";
const feature = {"id":"gap-ai-jamming-effectiveness","title":"Jamming Effectiveness Predictor","description":"Prepare a professional advisory report for jamming effectiveness predictor using the brief and evidence you provide. Review the findings, assumptions, and action plan before applying changes.","samples":[]};
export default function GapJammingEffectiveness({ token } : { token?: string } = {}) { return <AIWorkspace feature={feature} token={token} />; }
