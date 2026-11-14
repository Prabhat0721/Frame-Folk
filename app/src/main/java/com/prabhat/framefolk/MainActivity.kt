
package com.prabhat.framefolk

import android.content.Intent
import android.net.Uri
import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.compose.setContent
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.AddPhotoAlternate
import androidx.compose.material.icons.filled.ArrowBack
import androidx.compose.material.icons.filled.Check
import androidx.compose.material.icons.filled.Crop
import androidx.compose.material.icons.filled.Tune
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import coil.compose.AsyncImage

private val Navy = Color(0xFF0B0F17)
private val Panel = Color(0xFF151C28)
private val Gold = Color(0xFFD6AD63)
private val Muted = Color(0xFF929BAA)

class MainActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContent {
            FrameFolkApp()
        }
    }
}

@Composable
fun FrameFolkApp() {
    var selectedImage by remember { mutableStateOf<Uri?>(null) }
    var selectedTab by remember { mutableStateOf("Light") }

    val imagePicker = rememberLauncherForActivityResult(
        contract = ActivityResultContracts.OpenDocument()
    ) { uri ->
        selectedImage = uri
    }

    MaterialTheme(
        colorScheme = darkColorScheme(
            background = Navy,
            surface = Panel,
            primary = Gold
        )
    ) {
        Column(
            modifier = Modifier
                .fillMaxSize()
                .background(Navy)
                .padding(18.dp)
        ) {
            Row(
                modifier = Modifier.fillMaxWidth(),
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.SpaceBetween
            ) {
                Column {
                    Text(
                        "FRAME FOLK",
                        color = Gold,
                        fontSize = 23.sp,
                        fontWeight = FontWeight.Bold,
                        letterSpacing = 3.sp
                    )
                    Text(
                        "CREATIVE PHOTO STUDIO",
                        color = Muted,
                        fontSize = 10.sp,
                        letterSpacing = 2.sp
                    )
                }
                Icon(
                    Icons.Default.Tune,
                    contentDescription = "Settings",
                    tint = Gold
                )
            }

            Spacer(Modifier.height(22.dp))

            Box(
                modifier = Modifier
                    .fillMaxWidth()
                    .weight(1f)
                    .background(Panel, RoundedCornerShape(18.dp))
                    .border(1.dp, Color(0xFF283345), RoundedCornerShape(18.dp))
                    .clickable {
                        imagePicker.launch(arrayOf("image/*"))
                    },
                contentAlignment = Alignment.Center
            ) {
                if (selectedImage != null) {
                    AsyncImage(
                        model = selectedImage,
                        contentDescription = "Selected photo",
                        modifier = Modifier.fillMaxSize(),
                        contentScale = ContentScale.Fit
                    )
                } else {
                    Column(horizontalAlignment = Alignment.CenterHorizontally) {
                        Icon(
                            Icons.Default.AddPhotoAlternate,
                            contentDescription = null,
                            tint = Gold,
                            modifier = Modifier.size(54.dp)
                        )
                        Spacer(Modifier.height(12.dp))
                        Text(
                            "Open a Photo",
                            color = Color.White,
                            fontSize = 18.sp,
                            fontWeight = FontWeight.SemiBold
                        )
                        Text(
                            "Tap here to import an image",
                            color = Muted,
                            fontSize = 12.sp
                        )
                    }
                }
            }

            Spacer(Modifier.height(18.dp))

            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween
            ) {
                listOf("Light", "Color", "Effects", "Transform").forEach { tab ->
                    val active = selectedTab == tab
                    Text(
                        text = tab,
                        color = if (active) Gold else Muted,
                        fontSize = 12.sp,
                        fontWeight = if (active) FontWeight.Bold else FontWeight.Normal,
                        modifier = Modifier
                            .clickable { selectedTab = tab }
                            .padding(vertical = 10.dp)
                    )
                }
            }

            HorizontalDivider(color = Color(0xFF283345))

            Spacer(Modifier.height(14.dp))

            Text(
                selectedTab,
                color = Gold,
                fontSize = 17.sp,
                fontWeight = FontWeight.Bold
            )

            Spacer(Modifier.height(12.dp))

            when (selectedTab) {
                "Light" -> listOf("Exposure", "Brightness", "Contrast", "Highlights", "Shadows", "Whites", "Blacks")
                "Color" -> listOf("Temperature", "Tint", "Saturation", "Vibrance", "HSL", "Color Grading")
                "Effects" -> listOf("Texture", "Clarity", "Dehaze", "Vignette", "Noise Reduction")
                else -> listOf("Crop", "Rotate", "Flip")
            }.forEach { name ->
                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(vertical = 7.dp),
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.SpaceBetween
                ) {
                    Text(name, color = Color.White, fontSize = 13.sp)
                    Text(
                        "—",
                        color = Muted,
                        fontSize = 16.sp
                    )
                }
            }

            Spacer(Modifier.height(12.dp))

            Button(
                onClick = { },
                enabled = false,
                modifier = Modifier.fillMaxWidth(),
                colors = ButtonDefaults.buttonColors(
                    disabledContainerColor = Color(0xFF343B46)
                )
            ) {
                Text("EXPORT JPEG")
            }

            Text(
                "Phase 1 • Native Android foundation",
                color = Muted,
                fontSize = 10.sp,
                modifier = Modifier.align(Alignment.CenterHorizontally).padding(top = 8.dp)
            )
        }
    }
}
