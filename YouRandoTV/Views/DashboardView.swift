import SwiftUI
import AVKit

struct DashboardView: View {
    @EnvironmentObject var authViewModel: AuthViewModel
    @StateObject private var viewModel = DashboardViewModel()
    @State private var selectedVideo: Video?
    @State private var isShowingSettings = false
    
    private let columns = [
        GridItem(.adaptive(minimum: 300, maximum: 400), spacing: 20)
    ]
    
    var body: some View {
        NavigationStack {
            ZStack {
                Color.black.edgesIgnoringSafeArea(.all)
                
                VStack {
                    // Header
                    HStack {
                        Text("YouRando")
                            .font(.largeTitle)
                            .fontWeight(.bold)
                            .foregroundColor(.white)
                        
                        Spacer()
                        
                        Button(action: {
                            isShowingSettings = true
                        }) {
                            Image(systemName: "gearshape.fill")
                                .imageScale(.large)
                                .foregroundColor(.gray)
                        }
                        .buttonStyle(CardButtonStyle())
                        
                        Button(action: {
                            authViewModel.signOut()
                        }) {
                            Text("Sign Out")
                                .foregroundColor(.gray)
                        }
                        .buttonStyle(CardButtonStyle())
                    }
                    .padding()
                    
                    // Recommendation Categories
                    ScrollView {
                        // Featured Video
                        if let featuredVideo = viewModel.featuredVideo {
                            FeaturedVideoView(video: featuredVideo)
                                .frame(height: 400)
                                .onTapGesture {
                                    selectedVideo = featuredVideo
                                }
                        }
                        
                        // Categories
                        ForEach(viewModel.categories) { category in
                            VStack(alignment: .leading) {
                                Text(category.name)
                                    .font(.title2)
                                    .fontWeight(.bold)
                                    .foregroundColor(.white)
                                    .padding(.leading)
                                
                                ScrollView(.horizontal, showsIndicators: false) {
                                    LazyHStack(spacing: 20) {
                                        ForEach(category.videos) { video in
                                            VideoCardView(video: video)
                                                .frame(width: 300, height: 220)
                                                .onTapGesture {
                                                    selectedVideo = video
                                                }
                                        }
                                    }
                                    .padding(.horizontal)
                                }
                            }
                            .padding(.vertical)
                        }
                    }
                    
                    // Refresh button
                    Button(action: {
                        viewModel.refreshRecommendations()
                    }) {
                        HStack {
                            Image(systemName: "arrow.clockwise")
                            Text("Refresh Recommendations")
                        }
                        .padding()
                        .background(Color.blue)
                        .foregroundColor(.white)
                        .cornerRadius(8)
                    }
                    .buttonStyle(CardButtonStyle())
                    .disabled(viewModel.isLoading)
                    
                    if viewModel.isLoading {
                        ProgressView()
                            .padding()
                    }
                }
                .padding()
            }
            .sheet(item: $selectedVideo) { video in
                VideoPlayerView(video: video)
            }
            .sheet(isPresented: $isShowingSettings) {
                SettingsView()
            }
            .onAppear {
                viewModel.loadRecommendations()
            }
        }
    }
}

struct FeaturedVideoView: View {
    let video: Video
    
    var body: some View {
        ZStack(alignment: .bottomLeading) {
            AsyncImage(url: URL(string: video.thumbnailUrl)) { image in
                image
                    .resizable()
                    .aspectRatio(contentMode: .fill)
            } placeholder: {
                Rectangle()
                    .foregroundColor(.gray.opacity(0.3))
            }
            .frame(maxWidth: .infinity)
            .clipped()
            
            LinearGradient(
                gradient: Gradient(colors: [.clear, .black.opacity(0.8)]),
                startPoint: .top,
                endPoint: .bottom
            )
            
            VStack(alignment: .leading, spacing: 8) {
                Text("FEATURED")
                    .font(.caption)
                    .fontWeight(.bold)
                    .foregroundColor(.red)
                
                Text(video.title)
                    .font(.title)
                    .fontWeight(.bold)
                    .foregroundColor(.white)
                    .lineLimit(2)
                
                Text(video.channelTitle)
                    .font(.headline)
                    .foregroundColor(.gray)
            }
            .padding()
        }
        .cornerRadius(15)
        .shadow(radius: 10)
    }
}

struct VideoCardView: View {
    let video: Video
    
    var body: some View {
        VStack(alignment: .leading) {
            // Thumbnail
            AsyncImage(url: URL(string: video.thumbnailUrl)) { image in
                image
                    .resizable()
                    .aspectRatio(contentMode: .fill)
            } placeholder: {
                Rectangle()
                    .foregroundColor(.gray.opacity(0.3))
            }
            .frame(height: 150)
            .clipped()
            .cornerRadius(10)
            
            // Video details
            VStack(alignment: .leading, spacing: 4) {
                Text(video.title)
                    .font(.headline)
                    .foregroundColor(.white)
                    .lineLimit(2)
                
                Text(video.channelTitle)
                    .font(.subheadline)
                    .foregroundColor(.gray)
                    .lineLimit(1)
            }
            .padding(.top, 4)
        }
        .padding(8)
        .background(Color.black.opacity(0.6))
        .cornerRadius(15)
        .focusable(true)
        .shadow(radius: 5)
    }
}

struct VideoPlayerView: View {
    let video: Video
    @Environment(\.dismiss) private var dismiss
    @State private var isPlaying = true
    
    var body: some View {
        VStack {
            HStack {
                Button(action: {
                    dismiss()
                }) {
                    Image(systemName: "xmark")
                        .imageScale(.large)
                        .foregroundColor(.white)
                        .padding()
                }
                
                Spacer()
            }
            
            if let url = URL(string: "https://www.youtube.com/embed/\(video.id)") {
                VideoPlayer(player: AVPlayer(url: url))
                    .frame(maxWidth: .infinity, maxHeight: .infinity)
            } else {
                Text("Could not load video")
                    .foregroundColor(.white)
            }
            
            VStack(alignment: .leading) {
                Text(video.title)
                    .font(.title)
                    .fontWeight(.bold)
                    .foregroundColor(.white)
                
                Text(video.channelTitle)
                    .font(.headline)
                    .foregroundColor(.gray)
                
                Text(video.description)
                    .font(.body)
                    .foregroundColor(.white.opacity(0.8))
                    .padding(.top)
            }
            .padding()
        }
        .background(Color.black)
    }
}

struct DashboardView_Previews: PreviewProvider {
    static var previews: some View {
        DashboardView()
            .environmentObject(AuthViewModel())
    }
} 