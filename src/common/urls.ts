export const REPOSITORY_URL = 'https://github.com/w0fv1/csdm-lite';
export const DOCS_URL = `${REPOSITORY_URL}/tree/main/docs`;
export const APPLICATION_GUIDES_URL = `${REPOSITORY_URL}/blob/main/docs/application-guides.md`;
export const RELEASES_URL = `${REPOSITORY_URL}/releases`;
export const BUG_REPORT_URL = `${REPOSITORY_URL}/issues/new?assignees=&labels=&projects=&template=bug_report.yml`;

export function getReleaseTagUrl(version: string) {
  return `${REPOSITORY_URL}/releases/tag/v${version}`;
}

export function getApplicationGuideUrl(anchor?: string) {
  return anchor ? `${APPLICATION_GUIDES_URL}#${anchor}` : APPLICATION_GUIDES_URL;
}

export function getReleaseApiUrl(version: string) {
  return `https://api.github.com/repos/w0fv1/csdm-lite/releases/tags/v${version}`;
}
