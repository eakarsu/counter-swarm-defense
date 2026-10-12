import AIWorkspace from "../components/AIWorkspace";
const feature = {"id":"gap-nonai-nipr-sipr-authn","title":"NIPRNet/SIPRNet Authn","description":"Prepare a professional advisory report for niprnet/siprnet authn using the brief and evidence you provide. Review the findings, assumptions, and action plan before applying changes.","samples":[]};
export default function GapNiprSiprAuthn({ token } : { token?: string } = {}) { return <AIWorkspace feature={feature} token={token} />; }
