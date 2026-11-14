import AudioToolbox
import Capacitor
import Foundation

/// Plays each intent of `SoundsService` through System Sound Services.
///
/// A system sound mixes with whatever else is playing, never takes the audio
/// session and stays silent while the ring/silent switch is on silent, so this
/// plugin does not touch `AVAudioSession` at all. That gives epic #1742 the
/// behaviour of the `ambient` category without changing the app-wide session
/// (issue #1843).
///
/// One `SystemSoundID` per bundled file is created when the plugin loads and
/// kept for the app's lifetime. A file that cannot be found or created leaves
/// its intent silent; the call still resolves.
///
/// It is registered by `BridgeViewController`, not discovered from npm.
@objc(BiteSoundsPlugin)
public class BiteSoundsPlugin: CAPPlugin, CAPBridgedPlugin {
    public let identifier = "BiteSoundsPlugin"
    public let jsName = "BiteSounds"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "posted", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "celebration", returnType: CAPPluginReturnPromise)
    ]

    private var postedSound: SystemSoundID?
    private var celebrationSound: SystemSoundID?

    override public func load() {
        postedSound = Self.createSound(named: "posted")
        celebrationSound = Self.createSound(named: "celebration")
    }

    deinit {
        [postedSound, celebrationSound].compactMap { $0 }.forEach {
            AudioServicesDisposeSystemSoundID($0)
        }
    }

    @objc func posted(_ call: CAPPluginCall) {
        play(call, postedSound)
    }

    @objc func celebration(_ call: CAPPluginCall) {
        play(call, celebrationSound)
    }

    /// Plays and resolves straight away: the caller fires and forgets.
    private func play(_ call: CAPPluginCall, _ sound: SystemSoundID?) {
        if let sound = sound {
            AudioServicesPlaySystemSound(sound)
        }

        call.resolve()
    }

    /// The `.caf` files sit in the `Sounds` group, which Xcode copies flat into
    /// the bundle root.
    private static func createSound(named name: String) -> SystemSoundID? {
        guard let url = Bundle.main.url(forResource: name, withExtension: "caf") else {
            CAPLog.print("BiteSounds: \(name).caf is not in the bundle")
            return nil
        }

        var sound: SystemSoundID = 0
        let status = AudioServicesCreateSystemSoundID(url as CFURL, &sound)

        guard status == kAudioServicesNoError else {
            CAPLog.print("BiteSounds: could not create \(name).caf (\(status))")
            return nil
        }

        return sound
    }
}
