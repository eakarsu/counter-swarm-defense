import AIWorkspace from "../components/AIWorkspace";
const feature = {"id":"gap-nonai-atak-cot","title":"ATAK / CoT Interop","description":"Prepare a professional advisory report for atak / cot interop using the brief and evidence you provide. Review the findings, assumptions, and action plan before applying changes.","samples":[]};
export default function GapAtakCot({ token } : { token?: string } = {}) { return <AIWorkspace feature={feature} token={token} />; }
