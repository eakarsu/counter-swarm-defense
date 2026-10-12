import AIWorkspace from "../components/AIWorkspace";
const feature = {"id":"gap-nonai-effector-dispatch","title":"Effector Tasking API","description":"Prepare a professional advisory report for effector tasking api using the brief and evidence you provide. Review the findings, assumptions, and action plan before applying changes.","samples":[]};
export default function GapEffectorDispatch({ token } : { token?: string } = {}) { return <AIWorkspace feature={feature} token={token} />; }
