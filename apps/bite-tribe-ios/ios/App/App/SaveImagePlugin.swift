import Capacitor
import Photos

/// Saves a composed share image to the photo library (issue #1732).
///
/// The access asked for is add-only (`UC-SBS` `R-27`): the app can put the
/// image into Photos and can never read the library back. The image is the file
/// the share image composer wrote to the cache - the re-encoded canvas output,
/// never the original upload with its EXIF data (`R-21`).
///
/// It is registered by `BridgeViewController`, not discovered from npm.
@objc(SaveImagePlugin)
public class SaveImagePlugin: CAPPlugin, CAPBridgedPlugin {
    public let identifier = "SaveImagePlugin"
    public let jsName = "SaveImage"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "saveToPhotos", returnType: CAPPluginReturnPromise)
    ]

    /// Rejected with this code when the user has refused add access, so the web
    /// layer can tell them where to change it rather than show a generic failure.
    static let permissionDenied = "permission-denied"

    @objc func saveToPhotos(_ call: CAPPluginCall) {
        guard
            let path = call.getString("path"),
            let fileURL = URL(string: path),
            fileURL.isFileURL
        else {
            call.reject("A file URL is required.")
            return
        }

        PHPhotoLibrary.requestAuthorization(for: .addOnly) { status in
            guard status == .authorized || status == .limited else {
                call.reject(
                    "Adding photos is not allowed.",
                    Self.permissionDenied
                )
                return
            }

            PHPhotoLibrary.shared().performChanges({
                PHAssetCreationRequest.forAsset().addResource(
                    with: .photo,
                    fileURL: fileURL,
                    options: nil
                )
            }) { saved, error in
                if saved {
                    call.resolve()
                } else {
                    call.reject(
                        error?.localizedDescription ?? "The image was not saved."
                    )
                }
            }
        }
    }
}
