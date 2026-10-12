import AIWorkspace from "../components/AIWorkspace";
const feature = {"id":"cf-allied-threat-library","title":"Allied Forces Threat Library","description":"Prepare a professional advisory report for allied forces threat library using the brief and evidence you provide. Review the findings, assumptions, and action plan before applying changes.","samples":[]};
export default function CfAlliedThreatLibrary({ token } : { token?: string } = {}) { return <AIWorkspace feature={feature} token={token} />; }
