import Capacitor
import UIKit

/// Plays each intent of `HapticsService` through a pre-warmed feedback generator.
///
/// `@capacitor/haptics` creates a fresh generator for every call and never calls
/// `prepare()`, so the Taptic Engine can be cold and the pulse can arrive after
/// the frame it belongs to. This plugin holds one generator per style for the
/// app's lifetime and prepares it again after each play, so the next one is
/// ready (issue #1743).
///
/// It is registered by `BridgeViewController`, not discovered from npm.
@objc(BiteHapticsPlugin)
public class BiteHapticsPlugin: CAPPlugin, CAPBridgedPlugin {
    public let identifier = "BiteHapticsPlugin"
    public let jsName = "BiteHaptics"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "press", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "release", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "tick", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "selection", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "confirm", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "warning", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "success", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "error", returnType: CAPPluginReturnPromise)
    ]

    /// A release is the quieter half of a press, so it plays below full strength.
    private static let releaseIntensity: CGFloat = 0.6

    // UIKit feedback generators belong to the main thread, so these are only
    // created and touched there.
    private var rigid: UIImpactFeedbackGenerator?
    private var soft: UIImpactFeedbackGenerator?
    private var light: UIImpactFeedbackGenerator?
    private var medium: UIImpactFeedbackGenerator?
    private var heavy: UIImpactFeedbackGenerator?
    private var selectionGenerator: UISelectionFeedbackGenerator?
    private var notificationGenerator: UINotificationFeedbackGenerator?

    override public func load() {
        DispatchQueue.main.async {
            self.rigid = UIImpactFeedbackGenerator(style: .rigid)
            self.soft = UIImpactFeedbackGenerator(style: .soft)
            self.light = UIImpactFeedbackGenerator(style: .light)
            self.medium = UIImpactFeedbackGenerator(style: .medium)
            self.heavy = UIImpactFeedbackGenerator(style: .heavy)
            self.selectionGenerator = UISelectionFeedbackGenerator()
            self.notificationGenerator = UINotificationFeedbackGenerator()

            [
                self.rigid, self.soft, self.light, self.medium, self.heavy,
                self.selectionGenerator, self.notificationGenerator
            ].forEach { $0?.prepare() }
        }
    }

    @objc func press(_ call: CAPPluginCall) {
        play(call) { $0.rigid.map { Self.impact($0) } }
    }

    @objc func release(_ call: CAPPluginCall) {
        play(call) { $0.soft.map { Self.impact($0, intensity: Self.releaseIntensity) } }
    }

    @objc func tick(_ call: CAPPluginCall) {
        play(call) { plugin in
            guard let generator = plugin.selectionGenerator else { return }

            generator.selectionChanged()
            generator.prepare()
        }
    }

    @objc func selection(_ call: CAPPluginCall) {
        play(call) { $0.light.map { Self.impact($0) } }
    }

    @objc func confirm(_ call: CAPPluginCall) {
        play(call) { $0.medium.map { Self.impact($0) } }
    }

    @objc func warning(_ call: CAPPluginCall) {
        play(call) { $0.heavy.map { Self.impact($0) } }
    }

    @objc func success(_ call: CAPPluginCall) {
        play(call) { $0.notificationGenerator.map { Self.notify($0, .success) } }
    }

    @objc func error(_ call: CAPPluginCall) {
        play(call) { $0.notificationGenerator.map { Self.notify($0, .error) } }
    }

    /// Plays on the main thread and resolves straight away: the caller fires and
    /// forgets, and waiting for the main thread would only delay it.
    private func play(_ call: CAPPluginCall, _ feedback: @escaping (BiteHapticsPlugin) -> Void) {
        DispatchQueue.main.async {
            feedback(self)
        }

        call.resolve()
    }

    private static func impact(_ generator: UIImpactFeedbackGenerator, intensity: CGFloat = 1) {
        generator.impactOccurred(intensity: intensity)
        generator.prepare()
    }

    private static func notify(
        _ generator: UINotificationFeedbackGenerator,
        _ type: UINotificationFeedbackGenerator.FeedbackType
    ) {
        generator.notificationOccurred(type)
        generator.prepare()
    }
}
