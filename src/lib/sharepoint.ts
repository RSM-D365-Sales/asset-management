// Core asset documentation lives in SharePoint, one folder per asset
// matched by asset name under the "Asset Management" library folder.
const SP_LIBRARY_VIEW =
  'https://rsmd365sales.sharepoint.com/sites/RSMDynamics365Sales/Shared%20Documents/Forms/AllItems.aspx'
const SP_BASE_FOLDER = '/sites/RSMDynamics365Sales/Shared Documents/Asset Management'
const SP_VIEW_ID = '4e584c08-65c8-434b-8c7c-15c937c6abd3'

export function assetDocsUrl(assetName: string): string {
  const folder = encodeURIComponent(`${SP_BASE_FOLDER}/${assetName}`)
  return `${SP_LIBRARY_VIEW}?id=${folder}&viewid=${encodeURIComponent(SP_VIEW_ID)}`
}
