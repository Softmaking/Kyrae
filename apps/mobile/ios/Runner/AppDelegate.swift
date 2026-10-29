import Flutter
import UIKit
import PhotosUI
import UniformTypeIdentifiers

@main
@objc class AppDelegate: FlutterAppDelegate, FlutterImplicitEngineDelegate {
  private var attachmentBridge: AttachmentBridge?
  override func application(
    _ application: UIApplication,
    didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]?
  ) -> Bool {
    return super.application(application, didFinishLaunchingWithOptions: launchOptions)
  }

  func didInitializeImplicitFlutterEngine(_ engineBridge: FlutterImplicitEngineBridge) {
    GeneratedPluginRegistrant.register(with: engineBridge.pluginRegistry)
    let registrar = engineBridge.pluginRegistry.registrar(forPlugin: "KyraeAttachments")!
    attachmentBridge = AttachmentBridge(messenger: registrar.messenger())
  }
}

/// PHPicker grants access only to the chosen resources; no blanket Photos authorization.
final class AttachmentBridge: NSObject, PHPickerViewControllerDelegate, UIDocumentPickerDelegate {
  private var pending: FlutterResult?
  private var channel: FlutterMethodChannel!

  init(messenger: FlutterBinaryMessenger) {
    super.init()
    channel = FlutterMethodChannel(name: "cl.softmaking.kyrae/attachments", binaryMessenger: messenger)
    channel.setMethodCallHandler { [weak self] call, result in self?.handle(call, result) }
  }

  private var presenter: UIViewController? {
    var controller = UIApplication.shared.connectedScenes.compactMap { $0 as? UIWindowScene }
      .flatMap { $0.windows }.first { $0.isKeyWindow }?.rootViewController
    while let presented = controller?.presentedViewController { controller = presented }
    return controller
  }

  private func handle(_ call: FlutterMethodCall, _ result: @escaping FlutterResult) {
    guard pending == nil, let presenter = presenter else {
      result(FlutterError(code: "PICKER_BUSY", message: "El selector no está disponible.", details: nil)); return
    }
    if call.method == "pickOriginalPhotos" {
      var config = PHPickerConfiguration()
      config.filter = .images
      // Unlimited selection lets Dart report >5 explicitly instead of silently truncating.
      config.selectionLimit = 0
      config.preferredAssetRepresentationMode = .current
      if #available(iOS 15, *) { config.selection = .ordered }
      let picker = PHPickerViewController(configuration: config)
      picker.delegate = self
      pending = result
      presenter.present(picker, animated: true)
    } else if call.method == "saveOriginal", let args = call.arguments as? [String: Any],
              let path = args["path"] as? String {
      let url = URL(fileURLWithPath: path).standardizedFileURL
      guard url.path.hasPrefix(FileManager.default.temporaryDirectory.standardizedFileURL.path + "/kyrae-attachment-"),
            FileManager.default.fileExists(atPath: url.path) else {
        result(FlutterError(code: "INVALID_FILE", message: "Original temporal no disponible.", details: nil)); return
      }
      let picker = UIDocumentPickerViewController(forExporting: [url], asCopy: true)
      picker.delegate = self
      pending = result
      presenter.present(picker, animated: true)
    } else { result(FlutterMethodNotImplemented) }
  }

  func picker(_ picker: PHPickerViewController, didFinishPicking results: [PHPickerResult]) {
    picker.dismiss(animated: true)
    guard !results.isEmpty else { finish([]); return }
    guard results.count <= 5 else {
      finish(FlutterError(code: "COUNT_EXCEEDED", message: "Seleccionaste \(results.count) fotos. El máximo es 5; no se agregó ninguna.", details: nil)); return
    }
    // Copy while the provider's temporary URL is valid. Never decode/re-encode or rename a JPEG to HEIC.
    let group = DispatchGroup()
    let lock = NSLock()
    var rows = Array<[String: Any]?>(repeating: nil, count: results.count)
    var directories: [URL] = []
    var failed = false
    for (index, item) in results.enumerated() {
      let provider = item.itemProvider
      let types = provider.registeredTypeIdentifiers.filter { UTType($0)?.conforms(to: .image) == true }
      // Prefer a concrete HEIC/HEIF representation if offered; otherwise the first concrete image.
      let type = types.first { $0 == "public.heic" || $0 == "public.heif" }
        ?? types.first { $0 != "public.image" } ?? types.first
      guard let type = type else { failed = true; continue }
      group.enter()
      provider.loadFileRepresentation(forTypeIdentifier: type) { url, error in
        defer { group.leave() }
        do {
          guard let url = url, error == nil else { throw CocoaError(.fileReadUnknown) }
          let size = try url.resourceValues(forKeys: [.fileSizeKey]).fileSize ?? 0
          guard size <= 20971520 else { throw CocoaError(.fileReadTooLarge) }
          let directory = FileManager.default.temporaryDirectory.appendingPathComponent("kyrae-attachment-" + UUID().uuidString, isDirectory: true)
          try FileManager.default.createDirectory(at: directory, withIntermediateDirectories: true)
          lock.lock(); directories.append(directory); lock.unlock()
          // Provider file extension describes actual representation; suggestedName is used only when compatible.
          let ext = url.pathExtension
          var name = provider.suggestedName ?? url.lastPathComponent
          if URL(fileURLWithPath: name).pathExtension.lowercased() != ext.lowercased() {
            name = URL(fileURLWithPath: name).deletingPathExtension().lastPathComponent + "." + ext
          }
          guard name == (name as NSString).lastPathComponent, !name.contains("\\"),
                name.utf8.count <= 255, name.rangeOfCharacter(from: .controlCharacters) == nil else { throw CocoaError(.fileReadInvalidFileName) }
          let destination = directory.appendingPathComponent(name)
          let staging = directory.appendingPathComponent(".copying")
          try FileManager.default.copyItem(at: url, to: staging)
          try FileManager.default.moveItem(at: staging, to: destination)
          lock.lock(); rows[index] = ["path": destination.path, "name": name, "byteSize": size]; lock.unlock()
        } catch { lock.lock(); failed = true; lock.unlock() }
      }
    }
    group.notify(queue: .main) {
      if failed || rows.contains(where: { $0 == nil }) {
        for directory in directories { try? FileManager.default.removeItem(at: directory) }
        self.finish(FlutterError(code: "ORIGINAL_UNAVAILABLE", message: "No se pudo obtener alguna foto original (máximo 20 MiB y nombre 255 bytes). No se agregó ninguna; intenta desde Archivos.", details: nil))
      } else { self.finish(rows.compactMap { $0 }) }
    }
  }

  func documentPickerWasCancelled(_ controller: UIDocumentPickerViewController) { finish(false) }
  func documentPicker(_ controller: UIDocumentPickerViewController, didPickDocumentsAt urls: [URL]) { finish(!urls.isEmpty) }
  private func finish(_ value: Any?) {
    let result = pending; pending = nil; result?(value)
  }
}
