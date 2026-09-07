import Cocoa
import WebKit
@main
class AppDelegate: NSObject, NSApplicationDelegate, WKUIDelegate, WKNavigationDelegate, WKDownloadDelegate {
 var window:NSWindow!
 var web:WKWebView!
 static func main(){let app=NSApplication.shared;let delegate=AppDelegate();app.delegate=delegate;app.setActivationPolicy(.regular);app.run()}
 func applicationDidFinishLaunching(_ note:Notification){
  let menu=NSMenu();let item=NSMenuItem();menu.addItem(item);let submenu=NSMenu();submenu.addItem(withTitle:"Quit Fraction Studio",action:#selector(NSApplication.terminate(_:)),keyEquivalent:"q");item.submenu=submenu
  let editItem=NSMenuItem();editItem.title="Edit";let edit=NSMenu(title:"Edit");for (title,action,key) in [("Copy","copy:","c"),("Paste","paste:","v"),("Select All","selectAll:","a"),("Cut","cut:","x")]{edit.addItem(withTitle:title,action:Selector(action),keyEquivalent:key)};editItem.submenu=edit;menu.addItem(editItem);NSApp.mainMenu=menu
  window=NSWindow(contentRect:NSRect(x:0,y:0,width:1380,height:920),styleMask:[.titled,.closable,.miniaturizable,.resizable],backing:.buffered,defer:false);window.title="Fraction Studio · v6";window.center()
  web=WKWebView(frame:window.contentView!.bounds);web.autoresizingMask=[.width,.height];web.uiDelegate=self;web.navigationDelegate=self;window.contentView=web
  let root=Bundle.main.resourceURL!.appendingPathComponent("web");web.loadFileURL(root.appendingPathComponent("index.html"),allowingReadAccessTo:root)
  window.makeKeyAndOrderFront(nil);NSApp.activate(ignoringOtherApps:true)
 }
 func applicationShouldTerminateAfterLastWindowClosed(_ sender:NSApplication)->Bool {true}
 func webView(_ webView:WKWebView,runOpenPanelWith parameters:WKOpenPanelParameters,initiatedByFrame frame:WKFrameInfo,completionHandler:@escaping ([URL]?)->Void){let p=NSOpenPanel();p.allowsMultipleSelection=parameters.allowsMultipleSelection;p.canChooseDirectories=false;p.beginSheetModal(for:window){result in completionHandler(result == .OK ? p.urls:nil)}}
 func webView(_ webView:WKWebView,runJavaScriptAlertPanelWithMessage message:String,initiatedByFrame frame:WKFrameInfo,completionHandler:@escaping ()->Void){let a=NSAlert();a.messageText=message;a.beginSheetModal(for:window){_ in completionHandler()}}
 func webView(_ webView:WKWebView,runJavaScriptConfirmPanelWithMessage message:String,initiatedByFrame frame:WKFrameInfo,completionHandler:@escaping (Bool)->Void){let a=NSAlert();a.messageText=message;a.addButton(withTitle:"OK");a.addButton(withTitle:"Cancel");a.beginSheetModal(for:window){r in completionHandler(r == .alertFirstButtonReturn)}}
 func webView(_ webView:WKWebView,decidePolicyFor action:WKNavigationAction,decisionHandler:@escaping (WKNavigationActionPolicy)->Void){if action.shouldPerformDownload {decisionHandler(.download)}else if let u=action.request.url, u.scheme == "https" || u.scheme == "http" {NSWorkspace.shared.open(u);decisionHandler(.cancel)}else{decisionHandler(.allow)}}
 func webView(_ webView:WKWebView,navigationAction:WKNavigationAction,didBecome download:WKDownload){download.delegate=self}
 func webView(_ webView:WKWebView,navigationResponse:WKNavigationResponse,didBecome download:WKDownload){download.delegate=self}
 func download(_ download:WKDownload,decideDestinationUsing response:URLResponse,suggestedFilename:String,completionHandler:@escaping (URL?)->Void){let p=NSSavePanel();p.nameFieldStringValue=suggestedFilename;p.beginSheetModal(for:window){r in completionHandler(r == .OK ? p.url:nil)}}
}
