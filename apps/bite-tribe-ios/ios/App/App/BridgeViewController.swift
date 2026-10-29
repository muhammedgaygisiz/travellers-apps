import Capacitor
import UIKit

/// The app's root view controller, named by `Main.storyboard`.
///
/// It exists to register the plugins that live in this wrapper rather than in
/// npm, which Capacitor's plugin discovery cannot see. `BiteHapticsPlugin` is
/// the first (issue #1743), `SaveImagePlugin` the second (issue #1732) and
/// `SocialSharePlugin` the third (issue #1730).
class BridgeViewController: CAPBridgeViewController {
    override open func capacitorDidLoad() {
        bridge?.registerPluginInstance(BiteHapticsPlugin())
        bridge?.registerPluginInstance(SaveImagePlugin())
        bridge?.registerPluginInstance(SocialSharePlugin())
    }
}
