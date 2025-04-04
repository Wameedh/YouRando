import SwiftUI

struct SettingsView: View {
    @Environment(\.dismiss) private var dismiss
    @State private var showAdultContent = false
    @State private var maxResultsPerCategory = 10.0
    @State private var selectedCategoryIndex = 0
    @State private var useHighQualityThumbnails = true
    @State private var enableAutoplay = true
    @State private var showNotifications = true
    
    private let categories = [
        "All Categories",
        "Science & Technology",
        "History & Culture",
        "Music",
        "Education",
        "Travel & Events",
        "Gaming",
        "Sports",
        "Movies & TV",
        "News & Politics"
    ]
    
    var body: some View {
        NavigationStack {
            Form {
                Section(header: Text("Content Preferences")) {
                    Toggle("Show Adult Content", isOn: $showAdultContent)
                    
                    Picker("Default Category", selection: $selectedCategoryIndex) {
                        ForEach(0..<categories.count) { index in
                            Text(categories[index]).tag(index)
                        }
                    }
                    
                    VStack {
                        HStack {
                            Text("Videos Per Category")
                            Spacer()
                            Text("\(Int(maxResultsPerCategory))")
                                .foregroundColor(.gray)
                        }
                        
                        Slider(value: $maxResultsPerCategory, in: 5...25, step: 5) {
                            Text("Videos Per Category")
                        }
                    }
                }
                
                Section(header: Text("Video Playback")) {
                    Toggle("Enable Autoplay", isOn: $enableAutoplay)
                    Toggle("High Quality Thumbnails", isOn: $useHighQualityThumbnails)
                }
                
                Section(header: Text("Notifications")) {
                    Toggle("Enable Notifications", isOn: $showNotifications)
                }
                
                Section {
                    Button("Clear Watch History") {
                        // This would clear watch history in a real app
                    }
                    .foregroundColor(.red)
                    
                    Button("Reset Recommendations") {
                        // This would reset recommendation algorithm in a real app
                    }
                    .foregroundColor(.red)
                }
                
                Section {
                    HStack {
                        Text("Version")
                        Spacer()
                        Text("1.0.0")
                            .foregroundColor(.gray)
                    }
                }
            }
            .navigationTitle("Settings")
            .toolbar {
                ToolbarItem(placement: .navigationBarTrailing) {
                    Button("Done") {
                        dismiss()
                    }
                }
            }
        }
    }
}

struct SettingsView_Previews: PreviewProvider {
    static var previews: some View {
        SettingsView()
    }
} 