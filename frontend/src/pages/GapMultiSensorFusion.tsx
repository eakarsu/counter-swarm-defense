import AIWorkspace from "../components/AIWorkspace";
const feature = {"id":"gap-ai-multi-sensor-fusion","title":"Multi-Sensor Fusion","description":"Prepare a professional advisory report for multi-sensor fusion using the brief and evidence you provide. Review the findings, assumptions, and action plan before applying changes.","samples":[]};
export default function GapMultiSensorFusion({ token } : { token?: string } = {}) { return <AIWorkspace feature={feature} token={token} />; }
