import AIWorkspace from "../components/AIWorkspace";
const feature = {"id":"gap-ai-ew-policy","title":"Electronic Warfare Policy / RoE","description":"Prepare a professional advisory report for electronic warfare policy / roe using the brief and evidence you provide. Review the findings, assumptions, and action plan before applying changes.","samples":[]};
export default function GapEwPolicy({ token } : { token?: string } = {}) { return <AIWorkspace feature={feature} token={token} />; }
