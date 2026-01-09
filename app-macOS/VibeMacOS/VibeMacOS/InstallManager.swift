import Foundation

class InstallManager {
    func runScript(at path: String, output: @escaping (String) -> Void, completion: @escaping (Bool) -> Void) {
        let task = Process()
        task.executableURL = URL(fileURLWithPath: "/bin/bash")
        task.arguments = [path]

        let pipe = Pipe()
        let errorPipe = Pipe()

        task.standardOutput = pipe
        task.standardError = errorPipe

        // Read output
        pipe.fileHandleForReading.readabilityHandler = { handle in
            let data = handle.availableData
            if let text = String(data: data, encoding: .utf8), !text.isEmpty {
                output(text)
            }
        }

        // Read errors
        errorPipe.fileHandleForReading.readabilityHandler = { handle in
            let data = handle.availableData
            if let text = String(data: data, encoding: .utf8), !text.isEmpty {
                output(text)
            }
        }

        task.terminationHandler = { process in
            // Close handlers
            pipe.fileHandleForReading.readabilityHandler = nil
            errorPipe.fileHandleForReading.readabilityHandler = nil

            let success = process.terminationStatus == 0
            completion(success)
        }

        do {
            try task.run()
        } catch {
            output("Error: \(error.localizedDescription)\n")
            completion(false)
        }
    }

    func runCommand(_ command: String, output: @escaping (String) -> Void, completion: @escaping (Bool) -> Void) {
        let task = Process()
        task.executableURL = URL(fileURLWithPath: "/bin/bash")
        task.arguments = ["-c", command]

        let pipe = Pipe()
        let errorPipe = Pipe()

        task.standardOutput = pipe
        task.standardError = errorPipe

        pipe.fileHandleForReading.readabilityHandler = { handle in
            let data = handle.availableData
            if let text = String(data: data, encoding: .utf8), !text.isEmpty {
                output(text)
            }
        }

        errorPipe.fileHandleForReading.readabilityHandler = { handle in
            let data = handle.availableData
            if let text = String(data: data, encoding: .utf8), !text.isEmpty {
                output(text)
            }
        }

        task.terminationHandler = { process in
            pipe.fileHandleForReading.readabilityHandler = nil
            errorPipe.fileHandleForReading.readabilityHandler = nil

            let success = process.terminationStatus == 0
            completion(success)
        }

        do {
            try task.run()
        } catch {
            output("Error: \(error.localizedDescription)\n")
            completion(false)
        }
    }
}
