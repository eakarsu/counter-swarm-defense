import AIWorkspace from "../components/AIWorkspace";
const feature = {"id":"cf-ml-after-action","title":"After-Action ML Loop","description":"Prepare a professional advisory report for after-action ml loop using the brief and evidence you provide. Review the findings, assumptions, and action plan before applying changes.","samples":[]};
export default function CfMlAfterAction({ token } : { token?: string } = {}) { return <AIWorkspace feature={feature} token={token} />; }
