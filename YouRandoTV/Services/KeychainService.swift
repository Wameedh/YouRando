import Foundation
import Security

enum KeychainError: Error {
    case saveFailed(OSStatus)
    case loadFailed(OSStatus)
    case deleteFailed(OSStatus)
    case itemNotFound
    case unexpectedData
}

class KeychainService {
    private let accessTokenKey = "com.yourando.tv.accessToken"
    private let refreshTokenKey = "com.yourando.tv.refreshToken"
    
    func saveAccessToken(_ token: String) throws {
        try saveToKeychain(token, forKey: accessTokenKey)
    }
    
    func saveRefreshToken(_ token: String) throws {
        try saveToKeychain(token, forKey: refreshTokenKey)
    }
    
    func getAccessToken() throws -> String {
        return try getFromKeychain(forKey: accessTokenKey)
    }
    
    func getRefreshToken() throws -> String {
        return try getFromKeychain(forKey: refreshTokenKey)
    }
    
    func deleteAccessToken() throws {
        try deleteFromKeychain(forKey: accessTokenKey)
    }
    
    func deleteRefreshToken() throws {
        try deleteFromKeychain(forKey: refreshTokenKey)
    }
    
    // MARK: - Private Methods
    
    private func saveToKeychain(_ value: String, forKey key: String) throws {
        guard let data = value.data(using: .utf8) else {
            throw KeychainError.unexpectedData
        }
        
        let query: [String: Any] = [
            kSecClass as String: kSecClassGenericPassword,
            kSecAttrAccount as String: key,
            kSecValueData as String: data,
            kSecAttrAccessible as String: kSecAttrAccessibleAfterFirstUnlock
        ]
        
        // First, delete any existing item
        SecItemDelete(query as CFDictionary)
        
        // Then add the new item
        let status = SecItemAdd(query as CFDictionary, nil)
        
        guard status == errSecSuccess else {
            throw KeychainError.saveFailed(status)
        }
    }
    
    private func getFromKeychain(forKey key: String) throws -> String {
        let query: [String: Any] = [
            kSecClass as String: kSecClassGenericPassword,
            kSecAttrAccount as String: key,
            kSecReturnData as String: kCFBooleanTrue!,
            kSecMatchLimit as String: kSecMatchLimitOne
        ]
        
        var dataTypeRef: AnyObject?
        let status = SecItemCopyMatching(query as CFDictionary, &dataTypeRef)
        
        guard status == errSecSuccess else {
            if status == errSecItemNotFound {
                throw KeychainError.itemNotFound
            }
            throw KeychainError.loadFailed(status)
        }
        
        guard let data = dataTypeRef as? Data,
              let value = String(data: data, encoding: .utf8) else {
            throw KeychainError.unexpectedData
        }
        
        return value
    }
    
    private func deleteFromKeychain(forKey key: String) throws {
        let query: [String: Any] = [
            kSecClass as String: kSecClassGenericPassword,
            kSecAttrAccount as String: key
        ]
        
        let status = SecItemDelete(query as CFDictionary)
        
        guard status == errSecSuccess || status == errSecItemNotFound else {
            throw KeychainError.deleteFailed(status)
        }
    }
} 