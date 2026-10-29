import Capacitor
import Photos
import UIKit

/// Hands a composed share image straight to Instagram and Facebook (issue #1730).
///
/// The Stories editors read the image from the pasteboard, so it is written
/// there with a five-minute expiry and `localOnly` (`UC-SBS` `R-25`): it neither
/// lingers after the hand-off nor travels to the user's other devices through
/// Universal Clipboard. Instagram's feed composer can only open an image that is
/// already in the photo library, so that hand-off saves it first, with add-only
/// access (`R-27`).
///
/// Every hand-off carries Meta's public App ID, read from `MetaAppID` in
/// `Info.plist` (`R-28`). The image is the file the composer wrote to the cache,
/// never the original upload (`R-21`).
///
/// It is registered by `BridgeViewController`, not discovered from npm.
@objc(SocialSharePlugin)
public class SocialSharePlugin: CAPPlugin, CAPBridgedPlugin {
    public let identifier = "SocialSharePlugin"
    public let jsName = "SocialShare"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "canShareTo", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "shareToInstagramStory", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "shareToFacebookStory", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "shareToInstagramFeed", returnType: CAPPluginReturnPromise)
    ]

    /// The same code `SaveImagePlugin` rejects with, so the web layer has one.
    static let permissionDenied = "permission-denied"
    /// Rejected with when the target app is missing or would not open.
    static let unavailable = "unavailable"

    /// How long the image stays on the pasteboard (`R-25`).
    private static let pasteboardLifetime: TimeInterval = 300

    /// The URL each target is detected and opened by. Each scheme is listed in
    /// `LSApplicationQueriesSchemes`, without which `canOpenURL` says no.
    private static let detectionURL: [String: String] = [
        "instagram-story": "instagram-stories://share",
        "instagram-post": "instagram://library",
        "facebook-story": "facebook-stories://share"
    ]

    @objc func canShareTo(_ call: CAPPluginCall) {
        guard
            let target = call.getString("target"),
            let address = Self.detectionURL[target],
            let url = URL(string: address)
        else {
            call.reject("An unknown share target.")
            return
        }

        DispatchQueue.main.async {
            call.resolve(["available": UIApplication.shared.canOpenURL(url)])
        }
    }

    @objc func shareToInstagramStory(_ call: CAPPluginCall) {
        guard let appId = metaAppId(call), let image = imageData(call) else {
            return
        }

        shareToStory(
            call,
            items: ["com.instagram.sharedSticker.backgroundImage": image],
            url: URL(string: "instagram-stories://share?source_application=\(appId)")
        )
    }

    @objc func shareToFacebookStory(_ call: CAPPluginCall) {
        guard let appId = metaAppId(call), let image = imageData(call) else {
            return
        }

        shareToStory(
            call,
            items: [
                "com.facebook.sharedSticker.backgroundImage": image,
                "com.facebook.sharedSticker.appID": appId
            ],
            url: URL(string: "facebook-stories://share")
        )
    }

    @objc func shareToInstagramFeed(_ call: CAPPluginCall) {
        guard let fileURL = imageFileURL(call) else {
            return
        }

        PHPhotoLibrary.requestAuthorization(for: .addOnly) { status in
            guard status == .authorized || status == .limited else {
                call.reject("Adding photos is not allowed.", Self.permissionDenied)
                return
            }

            var localIdentifier: String?

            PHPhotoLibrary.shared().performChanges({
                let request = PHAssetCreationRequest.forAsset()
                request.addResource(with: .photo, fileURL: fileURL, options: nil)
                // Add-only access can never look the asset up again, so its id
                // is taken here, while the library is creating it.
                localIdentifier = request.placeholderForCreatedAsset?.localIdentifier
            }) { saved, error in
                guard saved, let localIdentifier else {
                    call.reject(error?.localizedDescription ?? "The image was not saved.")
                    return
                }

                var components = URLComponents(string: "instagram://library")
                components?.queryItems = [
                    URLQueryItem(name: "LocalIdentifier", value: localIdentifier)
                ]

                self.open(components?.url, call)
            }
        }
    }

    private func shareToStory(_ call: CAPPluginCall, items: [String: Any], url: URL?) {
        DispatchQueue.main.async {
            UIPasteboard.general.setItems(
                [items],
                options: [
                    .expirationDate: Date().addingTimeInterval(Self.pasteboardLifetime),
                    .localOnly: true
                ]
            )

            self.open(url, call)
        }
    }

    /// Opens the target app, and rejects if iOS would not - the app is missing,
    /// or its scheme is not one this app may query.
    private func open(_ url: URL?, _ call: CAPPluginCall) {
        DispatchQueue.main.async {
            guard let url, UIApplication.shared.canOpenURL(url) else {
                call.reject("The app is not installed.", Self.unavailable)
                return
            }

            UIApplication.shared.open(url, options: [:]) { opened in
                if opened {
                    call.resolve()
                } else {
                    call.reject("The app did not open.", Self.unavailable)
                }
            }
        }
    }

    /// Meta's public App ID, or nothing after rejecting the call.
    private func metaAppId(_ call: CAPPluginCall) -> String? {
        guard
            let appId = Bundle.main.object(forInfoDictionaryKey: "MetaAppID") as? String,
            !appId.isEmpty
        else {
            call.reject("The Meta App ID is not configured.")
            return nil
        }

        return appId
    }

    /// The cache file named by `path`, or nothing after rejecting the call.
    private func imageFileURL(_ call: CAPPluginCall) -> URL? {
        guard
            let path = call.getString("path"),
            let fileURL = URL(string: path),
            fileURL.isFileURL
        else {
            call.reject("A file URL is required.")
            return nil
        }

        return fileURL
    }

    private func imageData(_ call: CAPPluginCall) -> Data? {
        guard let fileURL = imageFileURL(call) else {
            return nil
        }

        guard let data = try? Data(contentsOf: fileURL) else {
            call.reject("The image could not be read.")
            return nil
        }

        return data
    }
}
