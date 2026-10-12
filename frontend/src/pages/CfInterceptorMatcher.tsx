import AIWorkspace from "../components/AIWorkspace";
const feature = {"id":"cf-interceptor-matcher","title":"Interceptor Matchmaker","description":"Prepare a professional advisory report for interceptor matchmaker using the brief and evidence you provide. Review the findings, assumptions, and action plan before applying changes.","samples":[]};
export default function CfInterceptorMatcher({ token } : { token?: string } = {}) { return <AIWorkspace feature={feature} token={token} />; }
