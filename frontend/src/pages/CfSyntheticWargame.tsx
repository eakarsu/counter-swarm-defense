import AIWorkspace from "../components/AIWorkspace";
const feature = {"id":"cf-synthetic-wargame","title":"Synthetic Swarm Wargame Generator","description":"Prepare a professional advisory report for synthetic swarm wargame generator using the brief and evidence you provide. Review the findings, assumptions, and action plan before applying changes.","samples":[]};
export default function CfSyntheticWargame({ token } : { token?: string } = {}) { return <AIWorkspace feature={feature} token={token} />; }
